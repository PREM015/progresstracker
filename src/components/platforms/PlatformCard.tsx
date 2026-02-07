import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PlatformConfig {
  id: string;
  name: string;
  description: string;
  icon?: React.ReactNode;
  isConnected: boolean;
  lastSynced?: Date;
  status: 'connected' | 'disconnected' | 'error';
}

interface PlatformCardProps {
  platform: PlatformConfig;
  onConnect: (id: string) => void;
  onDisconnect: (id: string) => void;
  onSync: (id: string) => void;
}

export function PlatformCard({ platform, onConnect, onDisconnect, onSync }: PlatformCardProps) {
  return (
    <Card className={cn("transition-all hover:shadow-md", platform.isConnected ? "border-primary/50" : "")}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex items-center gap-3">
          {platform.icon && <div className="p-2 bg-muted rounded-md">{platform.icon}</div>}
          <div>
            <CardTitle className="text-base">{platform.name}</CardTitle>
            <CardDescription className="text-xs mt-1">{platform.description}</CardDescription>
          </div>
        </div>
        {platform.isConnected ? (
          <Badge variant="default" className="bg-green-500 hover:bg-green-600">Connected</Badge>
        ) : (
          <Badge variant="outline">Not Connected</Badge>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-xs text-muted-foreground mt-2">
          {platform.isConnected && platform.lastSynced ? (
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              Last synced: {platform.lastSynced.toLocaleDateString()}
            </div>
          ) : platform.status === 'error' ? (
            <div className="flex items-center gap-1 text-destructive">
              <AlertCircle className="h-3 w-3" />
              Sync Error
            </div>
          ) : (
            <div className="h-4"></div> // Spacer
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        {platform.isConnected ? (
          <>
            <Button variant="outline" size="sm" onClick={() => onDisconnect(platform.id)}>Disconnect</Button>
            <Button variant="secondary" size="sm" onClick={() => onSync(platform.id)}>Sync Now</Button>
          </>
        ) : (
          <Button className="w-full" size="sm" onClick={() => onConnect(platform.id)}>Connect</Button>
        )}
      </CardFooter>
    </Card>
  );
}
