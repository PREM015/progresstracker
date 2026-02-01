// src/services/sync/conflictResolver.ts
import { logger } from '@/lib/logger';


const log = logger.child({ service: 'ConflictResolver' });

export type ConflictStrategy = 'server_wins' | 'client_wins' | 'merge' | 'latest_wins';

export interface ConflictData {
  field: string;
  serverValue: unknown;
  clientValue: unknown;
  lastModified: {
    server: Date;
    client: Date;
  };
}

export class ConflictResolver {
  /**
   * Resolve sync conflicts
   */
  static resolve(
    conflicts: ConflictData[],
    strategy: ConflictStrategy = 'latest_wins'
  ): Record<string, unknown> {
    const resolved: Record<string, unknown> = {};

    for (const conflict of conflicts) {
      switch (strategy) {
        case 'server_wins':
          resolved[conflict.field] = conflict.serverValue;
          break;

        case 'client_wins':
          resolved[conflict.field] = conflict.clientValue;
          break;

        case 'latest_wins':
          resolved[conflict.field] =
            conflict.lastModified.server > conflict.lastModified.client
              ? conflict.serverValue
              : conflict.clientValue;
          break;

        case 'merge':
          resolved[conflict.field] = this.mergeValues(
            conflict.serverValue,
            conflict.clientValue
          );
          break;

        default:
          resolved[conflict.field] = conflict.serverValue;
      }
    }

    log.info('Conflicts resolved', { strategy, count: conflicts.length });

    return resolved;
  }

  /**
   * Merge numeric values (sum them)
   */
  private static mergeValues(serverValue: unknown, clientValue: unknown): unknown {
    // Numeric merge
    if (typeof serverValue === 'number' && typeof clientValue === 'number') {
      return Math.max(serverValue, clientValue);
    }

    // String merge (prefer non-empty)
    if (typeof serverValue === 'string' && typeof clientValue === 'string') {
      return serverValue || clientValue;
    }

    // Array merge (unique values)
    if (Array.isArray(serverValue) && Array.isArray(clientValue)) {
      return [...new Set([...serverValue, ...clientValue])];
    }

    // Object merge
    if (this.isPlainObject(serverValue) && this.isPlainObject(clientValue)) {
      return { ...serverValue, ...clientValue };
    }

    // Default: latest wins (client)
    return clientValue;
  }

  /**
   * Check if value is plain object
   */
  private static isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  /**
   * Detect conflicts between server and client data
   */
  static detectConflicts(
    serverData: Record<string, unknown>,
    clientData: Record<string, unknown>,
    serverModified: Date,
    clientModified: Date
  ): ConflictData[] {
    const conflicts: ConflictData[] = [];
    const allKeys = new Set([...Object.keys(serverData), ...Object.keys(clientData)]);

    for (const key of allKeys) {
      if (serverData[key] !== clientData[key]) {
        conflicts.push({
          field: key,
          serverValue: serverData[key],
          clientValue: clientData[key],
          lastModified: {
            server: serverModified,
            client: clientModified,
          },
        });
      }
    }

    log.info('Conflicts detected', { count: conflicts.length });

    return conflicts;
  }
}

export default ConflictResolver;