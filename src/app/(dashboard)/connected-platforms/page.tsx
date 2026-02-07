import { PlatformList } from '@/components/platforms/PlatformList';
import { MetaTags } from '@/components/seo/MetaTags';

export default function ConnectedPlatformsPage() {
  return (
    <div className="space-y-6">
      <MetaTags title="Connected Platforms" description="Manage your external accounts" />

      <div>
        <h2 className="text-3xl font-bold tracking-tight">Connected Platforms</h2>
        <p className="text-muted-foreground">
          Manage your connections to external coding platforms to verify your progress.
        </p>
      </div>

      <PlatformList platforms={[]} />
    </div>
  );
}
