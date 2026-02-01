// src/lib/monitoring.ts
/**
 * Application Monitoring & Health Checks
 * Provides system health, metrics collection, and alerting
 */

import { prisma } from './prisma';
import { cache } from './redis';
import { logger } from './logger';

// =============================================================================
// TYPES
// =============================================================================

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: HealthCheck[];
}

export interface HealthCheck {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  latency?: number;
  message?: string;
  lastChecked: string;
}

export interface SystemMetrics {
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
  };
  uptime: number;
  timestamp: string;
}

export interface ApplicationMetrics {
  users: {
    total: number;
    active: number;
    newToday: number;
  };
  syncs: {
    total: number;
    successful: number;
    failed: number;
    avgDuration: number;
  };
  api: {
    requestsPerMinute: number;
    averageLatency: number;
    errorRate: number;
  };
  timestamp: string;
}

export interface Alert {
  id: string;
  type: 'error' | 'warning' | 'info';
  source: string;
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  acknowledged: boolean;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
}

// =============================================================================
// MONITORING SERVICE
// =============================================================================

class MonitoringService {
  private readonly startTime = Date.now();
  private readonly log = logger.child({ service: 'monitoring' });
  private readonly METRICS_CACHE_KEY = 'app:metrics';
  private readonly METRICS_TTL = 60; // 1 minute
  private readonly alerts: Map<string, Alert> = new Map();

  /**
   * Get application health status
   */
  async getHealthStatus(): Promise<HealthStatus> {
    const startTime = Date.now();
    const checks: HealthCheck[] = [];

    // Database check
    checks.push(await this.checkDatabase());

    // Redis check
    checks.push(await this.checkRedis());

    // External services check
    checks.push(await this.checkExternalServices());

    // Determine overall status
    const hasFailure = checks.some((c) => c.status === 'fail');
    const hasWarning = checks.some((c) => c.status === 'warn');

    let status: HealthStatus['status'] = 'healthy';
    if (hasFailure) {
      status = 'unhealthy';
    } else if (hasWarning) {
      status = 'degraded';
    }

    const healthStatus: HealthStatus = {
      status,
      timestamp: new Date().toISOString(),
      uptime: this.getUptime(),
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks,
    };

    this.log.debug('Health check completed', {
      status,
      duration: Date.now() - startTime,
    });

    return healthStatus;
  }

  /**
   * Get system metrics
   */
  getSystemMetrics(): SystemMetrics {
    const memoryUsage = process.memoryUsage();

    return {
      memory: {
        used: memoryUsage.heapUsed,
        total: memoryUsage.heapTotal,
        percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100),
      },
      cpu: {
        usage: this.getCpuUsage(),
      },
      uptime: this.getUptime(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get application metrics
   */
  async getApplicationMetrics(): Promise<ApplicationMetrics> {
    // Try cache first
    const cached = await cache.get<ApplicationMetrics>(this.METRICS_CACHE_KEY);
    if (cached) {
      return cached;
    }

    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

    try {
      // User metrics
      const [totalUsers, activeUsers, newUsers] = await Promise.all([
        prisma.user.count({ where: { deletedAt: null } }),
        prisma.user.count({
          where: {
            lastActiveAt: { gte: last24Hours },
            deletedAt: null,
          },
        }),
        prisma.user.count({
          where: {
            createdAt: { gte: todayStart },
          },
        }),
      ]);

      // Sync metrics
      const syncLogs = await prisma.syncLog.findMany({
        where: {
          createdAt: { gte: last24Hours },
        },
        select: {
          status: true,
          duration: true,
        },
      });

      const successfulSyncs = syncLogs.filter((s) => s.status === 'SUCCESS').length;
      const failedSyncs = syncLogs.filter((s) => s.status === 'FAILED').length;
      const avgDuration = syncLogs.length > 0
        ? syncLogs.reduce((sum, s) => sum + (s.duration || 0), 0) / syncLogs.length
        : 0;

      const metrics: ApplicationMetrics = {
        users: {
          total: totalUsers,
          active: activeUsers,
          newToday: newUsers,
        },
        syncs: {
          total: syncLogs.length,
          successful: successfulSyncs,
          failed: failedSyncs,
          avgDuration: Math.round(avgDuration),
        },
        api: {
          requestsPerMinute: 0, // Would need request logging
          averageLatency: 0,
          errorRate: 0,
        },
        timestamp: new Date().toISOString(),
      };

      // Cache metrics
      await cache.set(this.METRICS_CACHE_KEY, metrics, this.METRICS_TTL);

      return metrics;
    } catch (error) {
      this.log.error('Failed to collect application metrics', {}, error);
      throw error;
    }
  }

  /**
   * Create an alert
   */
  createAlert(
    type: Alert['type'],
    source: string,
    message: string,
    metadata?: Record<string, unknown>
  ): Alert {
    const alert: Alert = {
      id: crypto.randomUUID(),
      type,
      source,
      message,
      metadata,
      createdAt: new Date(),
      acknowledged: false,
    };

    this.alerts.set(alert.id, alert);

    this.log.warn('Alert created', {
      alertId: alert.id,
      type,
      source,
      message,
    });

    // Could also send to external alerting service (PagerDuty, Slack, etc.)

    return alert;
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.alerts.get(alertId);
    
    if (!alert) {
      return false;
    }

    alert.acknowledged = true;
    alert.acknowledgedAt = new Date();
    alert.acknowledgedBy = acknowledgedBy;

    this.log.info('Alert acknowledged', { alertId, acknowledgedBy });

    return true;
  }

  /**
   * Get active alerts
   */
  getAlerts(options: { acknowledged?: boolean } = {}): Alert[] {
    const alerts = Array.from(this.alerts.values());

    if (options.acknowledged !== undefined) {
      return alerts.filter((a) => a.acknowledged === options.acknowledged);
    }

    return alerts;
  }

  /**
   * Clear old alerts
   */
  cleanupAlerts(maxAge: number = 24 * 60 * 60 * 1000): number {
    const cutoff = Date.now() - maxAge;
    let removed = 0;

    for (const [id, alert] of this.alerts) {
      if (alert.createdAt.getTime() < cutoff && alert.acknowledged) {
        this.alerts.delete(id);
        removed++;
      }
    }

    return removed;
  }

  // =============================================================================
  // PRIVATE METHODS
  // =============================================================================

  private async checkDatabase(): Promise<HealthCheck> {
    const startTime = Date.now();
    const name = 'database';

    try {
      await prisma.$queryRaw`SELECT 1`;
      const latency = Date.now() - startTime;

      return {
        name,
        status: latency > 1000 ? 'warn' : 'pass',
        latency,
        message: latency > 1000 ? 'High latency detected' : undefined,
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      return {
        name,
        status: 'fail',
        latency: Date.now() - startTime,
        message: error instanceof Error ? error.message : 'Database connection failed',
        lastChecked: new Date().toISOString(),
      };
    }
  }

  private async checkRedis(): Promise<HealthCheck> {
    const startTime = Date.now();
    const name = 'redis';

    try {
      await cache.set('health:check', 'ok', 10);
      const value = await cache.get('health:check');
      const latency = Date.now() - startTime;

      if (value !== 'ok') {
        return {
          name,
          status: 'warn',
          latency,
          message: 'Cache read/write mismatch',
          lastChecked: new Date().toISOString(),
        };
      }

      return {
        name,
        status: latency > 500 ? 'warn' : 'pass',
        latency,
        message: latency > 500 ? 'High latency detected' : undefined,
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      return {
        name,
        status: 'warn', // Redis is optional, so warn instead of fail
        latency: Date.now() - startTime,
        message: error instanceof Error ? error.message : 'Redis connection failed',
        lastChecked: new Date().toISOString(),
      };
    }
  }

  private async checkExternalServices(): Promise<HealthCheck> {
    const name = 'external_services';
    const startTime = Date.now();

    // Check if any platform is in maintenance
    try {
      const maintenancePlatforms = await prisma.platform.count({
        where: { maintenanceMode: true },
      });

      const latency = Date.now() - startTime;

      if (maintenancePlatforms > 0) {
        return {
          name,
          status: 'warn',
          latency,
          message: `${maintenancePlatforms} platform(s) in maintenance`,
          lastChecked: new Date().toISOString(),
        };
      }

      return {
        name,
        status: 'pass',
        latency,
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      return {
        name,
        status: 'fail',
        latency: Date.now() - startTime,
        message: error instanceof Error ? error.message : 'Failed to check external services',
        lastChecked: new Date().toISOString(),
      };
    }
  }

  private getUptime(): number {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  private getCpuUsage(): number {
    // Simple CPU usage estimation
    // In production, you might want to use os.cpus() for more accurate metrics
    const cpuUsage = process.cpuUsage();
    const total = cpuUsage.user + cpuUsage.system;
    return Math.min(100, Math.round(total / 1000000)); // Convert to percentage estimate
  }
}

// =============================================================================
// SINGLETON & EXPORTS
// =============================================================================

export const monitoring = new MonitoringService();

/**
 * Quick health check
 */
export async function healthCheck(): Promise<HealthStatus> {
  return monitoring.getHealthStatus();
}

/**
 * Check if system is healthy
 */
export async function isHealthy(): Promise<boolean> {
  const status = await monitoring.getHealthStatus();
  return status.status !== 'unhealthy';
}

export default monitoring;