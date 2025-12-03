// src/components/settings/SyncSettings.tsx

'use client';

import  { useState, useEffect } from 'react';
import { Save, Loader2, Zap, Clock, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card';
import  Button  from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import  RadioGroup  from '@/components/ui/RadioGroup'
import { useToast } from '@/hooks/useToast';

const syncFrequencies = [
  {
    value: 'hourly',
    label: 'Every Hour',
    description: 'Sync automatically every hour',
    icon: Zap,
  },
  {
    value: 'daily',
    label: 'Daily',
    description: 'Sync once per day at 2 AM',
    icon: Clock,
  },
  {
    value: 'weekly',
    label: 'Weekly',
    description: 'Sync every Sunday at 2 AM',
    icon: Clock,
  },
  {
    value: 'manual',
    label: 'Manual Only',
    description: 'Only sync when you trigger it',
    icon: RefreshCw,
  },
];

export function SyncSettings() {
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState({
    autoSync: true,
    syncFrequency: 'daily' as 'hourly' | 'daily' | 'weekly' | 'manual',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/user/settings');
      if (!response.ok) throw new Error('Failed to fetch settings');
      
      const data = await response.json();
      if (data.settings) {
        setSettings({
          autoSync: data.settings.autoSync ?? true,
          syncFrequency: data.settings.syncFrequency || 'daily',
        });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update settings');
      }

      showToast('Sync settings updated successfully', 'success');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to update settings',
        'error'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sync Settings</CardTitle>
        <CardDescription>
          Configure how and when your platforms sync
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Auto Sync Toggle */}
        <div className="flex items-center justify-between pb-6 border-b">
          <div>
            <h3 className="font-medium">Automatic Sync</h3>
            <p className="text-sm text-muted-foreground">
              Automatically sync data from connected platforms
            </p>
          </div>
          <Switch
            checked={settings.autoSync}
            onCheckedChange={(checked) =>
              setSettings((prev) => ({ ...prev, autoSync: checked }))
            }
          />
        </div>

        {/* Sync Frequency */}
        {settings.autoSync && (
          <div>
            <label className="block text-sm font-medium mb-3">
              Sync Frequency
            </label>
            <div className="space-y-3">
              {syncFrequencies.map((frequency) => {
                const Icon = frequency.icon;
                return (
                  <button
                    key={frequency.value}
                    onClick={() =>
                      setSettings((prev) => ({
                        ...prev,
                        syncFrequency: frequency.value as any,
                      }))
                    }
                    className={`w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-colors text-left ${
                      settings.syncFrequency === frequency.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex-shrink-0">
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          settings.syncFrequency === frequency.value
                            ? 'border-primary'
                            : 'border-muted-foreground'
                        }`}
                      >
                        {settings.syncFrequency === frequency.value && (
                          <div className="w-2 h-2 rounded-full bg-primary" />
                        )}
                      </div>
                    </div>
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="font-medium">{frequency.label}</p>
                      <p className="text-sm text-muted-foreground">
                        {frequency.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-muted/50 p-4 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> You can always trigger a manual sync from the
            Connections page, regardless of these settings.
          </p>
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
                Save Changes
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}