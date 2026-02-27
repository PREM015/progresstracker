import { SyncDashboard } from '@/components/platforms/SyncDashboard';
import { MetaTags } from '@/components/seo/MetaTags';

export default function SyncPage() {
    return (
        <>
            <MetaTags title="Platform Sync" description="Manage your connected platforms and synchronization status." />
            <SyncDashboard />
        </>
    );
}
