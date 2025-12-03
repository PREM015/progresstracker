// src/components/settings/NotificationSettings.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { Save, Loader2, Mail, Bell, Calendar, Trophy, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { useToast } from '@/hooks/useToast';

interface NotificationPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  weeklyReport: boolean;
  dailyReminder: boolean;
  goalReminders: boolean;
  achievementAlerts: boolean;
  syncFailures: boolean;
  newFeatures: boolean;
}

export function NotificationSettings() {
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    emailNotifications: true,
    pushNotifications: false,
    weeklyReport: true,
    dailyReminder: false,
    goalReminders: true,
    achievementAlerts: true,
    syncFailures: true,
    newFeatures: true,
  });

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const response = await fetch('/api/user/notifications');
      if (!response.ok) throw new Error('Failed to fetch preferences');
      
      const data = await response.json();
      if (data.notifications) {
        setPreferences(data.notifications);
      }
    } catch (error) {
      showToast('Failed to load notification preferences', 'error');
    } finally {
      setIsFetching(false);
    }
  };

  const handleToggle = (key: keyof NotificationPreferences) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = async () => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/user/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update preferences');
      }

      showToast('Notification preferences updated successfully', 'success');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to update preferences',
        'error'
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
        <CardDescription>
          Manage how and when you receive notifications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Email Notifications */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-4 border-b">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <h3 className="font-medium">Email Notifications</h3>
                <p className="text-sm text-muted-foreground">
                  Receive notifications via email
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.emailNotifications}
              onCheckedChange={() => handleToggle('emailNotifications')}
            />
          </div>

          {/* Push Notifications */}
          <div className="flex items-center justify-between pb-4 border-b">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <div>
                <h3 className="font-medium">Push Notifications</h3>
                <p className="text-sm text-muted-foreground">
                  Receive browser push notifications
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.pushNotifications}
              onCheckedChange={() => handleToggle('pushNotifications')}
            />
          </div>
        </div>

        {/* Reports */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Reports
          </h3>

          <div className="flex items-center justify-between pb-4 border-b">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <h3 className="font-medium">Weekly Report</h3>
                <p className="text-sm text-muted-foreground">
                  Get a summary of your weekly progress
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.weeklyReport}
              onCheckedChange={() => handleToggle('weeklyReport')}
              disabled={!preferences.emailNotifications}
            />
          </div>

          <div className="flex items-center justify-between pb-4 border-b">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <div>
                <h3 className="font-medium">Daily Reminder</h3>
                <p className="text-sm text-muted-foreground">
                  Daily reminder to log your progress
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.dailyReminder}
              onCheckedChange={() => handleToggle('dailyReminder')}
              disabled={!preferences.emailNotifications}
            />
          </div>
        </div>

        {/* Activity Alerts */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Activity Alerts
          </h3>

          <div className="flex items-center justify-between pb-4 border-b">
            <div className="flex items-center gap-3">
              <Trophy className="h-5 w-5 text-muted-foreground" />
              <div>
                <h3 className="font-medium">Goal Reminders</h3>
                <p className="text-sm text-muted-foreground">
                  Reminders for active goals and deadlines
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.goalReminders}
              onCheckedChange={() => handleToggle('goalReminders')}
              disabled={!preferences.emailNotifications}
            />
          </div>

          <div className="flex items-center justify-between pb-4 border-b">
            <div className="flex items-center gap-3">
              <Trophy className="h-5 w-5 text-muted-foreground" />
              <div>
                <h3 className="font-medium">Achievement Alerts</h3>
                <p className="text-sm text-muted-foreground">
                  Get notified when you unlock achievements
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.achievementAlerts}
              onCheckedChange={() => handleToggle('achievementAlerts')}
              disabled={!preferences.emailNotifications}
            />
          </div>

          <div className="flex items-center justify-between pb-4 border-b">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-muted-foreground" />
              <div>
                <h3 className="font-medium">Sync Failures</h3>
                <p className="text-sm text-muted-foreground">
                  Alert when platform sync fails
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.syncFailures}
              onCheckedChange={() => handleToggle('syncFailures')}
              disabled={!preferences.emailNotifications}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <div>
                <h3 className="font-medium">New Features</h3>
                <p className="text-sm text-muted-foreground">
                  Updates about new features and improvements
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.newFeatures}
              onCheckedChange={() => handleToggle('newFeatures')}
              disabled={!preferences.emailNotifications}
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Preferences
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}