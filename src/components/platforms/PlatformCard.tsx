import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, Trophy, Zap, Code } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PlatformConfig {
  id: string;
  name: string;
  description: string;
  icon?: React.ReactNode;
  isConnected: boolean;
  lastSynced?: Date;
  status: 'connected' | 'disconnected' | 'error';
  metrics?: {
    solved?: number;
    rating?: number;
    streak?: number;
  };
}

interface PlatformCardProps {
  platform: PlatformConfig;
  onConnect: (id: string) => void;
  onDisconnect: (id: string) => void;
  onSync: (id: string) => void;
}

export function PlatformCard({ platform, onConnect, onDisconnect, onSync }: PlatformCardProps) {
  return (
    <Card className={cn(
      "transition-all hover:shadow-lg border-2",
      platform.isConnected ? "border-primary/20 bg-primary/5" : "border-transparent bg-card"
    )}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex items-center gap-3">
          {platform.icon && <div className="p-2 bg-muted rounded-xl shadow-sm">{platform.icon}</div>}
          <div>
            <CardTitle className="text-base font-bold">{platform.name}</CardTitle>
            <CardDescription className="text-[10px] mt-0.5 line-clamp-1">{platform.description}</CardDescription>
          </div>
        </div>
        <Badge
          variant={platform.isConnected ? "default" : "outline"}
          className={cn(
            "text-[10px] px-1.5 h-5 rounded-full",
            platform.isConnected && "bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20"
          )}
        >
          {platform.isConnected ? 'Active' : 'Missing'}
        </Badge>
      </CardHeader>

      <CardContent className="min-h-[60px]">
        {platform.isConnected && platform.metrics ? (
          <div className="grid grid-cols-3 gap-2 mt-2">
            {platform.metrics.solved !== undefined && (
              <div className="flex flex-col items-center p-1.5 bg-background/50 rounded-lg border">
                <Code className="h-3 w-3 text-blue-500 mb-1" />
                <span className="text-[10px] font-bold">{platform.metrics.solved}</span>
                <span className="text-[8px] text-muted-foreground uppercase">Solved</span>
              </div>
            )}
            {platform.metrics.rating !== undefined && (
              <div className="flex flex-col items-center p-1.5 bg-background/50 rounded-lg border">
                <Trophy className="h-3 w-3 text-amber-500 mb-1" />
                <span className="text-[10px] font-bold">{platform.metrics.rating}</span>
                <span className="text-[8px] text-muted-foreground uppercase">Rating</span>
              </div>
            )}
            {platform.metrics.streak !== undefined && (
              <div className="flex flex-col items-center p-1.5 bg-background/50 rounded-lg border">
                <Zap className="h-3 w-3 text-orange-500 mb-1" />
                <span className="text-[10px] font-bold">{platform.metrics.streak}</span>
                <span className="text-[8px] text-muted-foreground uppercase">Streak</span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full pt-4 opacity-40 grayscale italic text-[10px]">
            {platform.isConnected ? 'Waiting for first sync...' : 'Connect to see stats'}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-2 pt-0">
        <div className="flex items-center justify-between w-full text-[10px] text-muted-foreground mb-2 px-1">
          {platform.isConnected && platform.lastSynced ? (
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-2.5 w-2.5 text-green-500" />
              Sync: {platform.lastSynced.toLocaleDateString()}
            </div>
          ) : platform.status === 'error' ? (
            <div className="flex items-center gap-1 text-destructive">
              <AlertCircle className="h-2.5 w-2.5" />
              Sync Error
            </div>
          ) : (
            <div>Ready to link</div>
          )}
        </div>

        <div className="flex gap-2 w-full">
          {platform.isConnected ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 text-[11px] h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => onDisconnect(platform.id)}
              >
                Disconnect
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-[11px] h-8"
                onClick={() => onSync(platform.id)}
              >
                Sync Now
              </Button>
            </>
          ) : (
            <Button className="w-full text-[11px] h-8 font-bold" size="sm" onClick={() => onConnect(platform.id)}>
              Connect Platform
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
