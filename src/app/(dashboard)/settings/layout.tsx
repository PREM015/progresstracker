import { SettingsNavigation } from "@/components/settings/SettingsNavigation";

export default function SettingsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen p-4 sm:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                    <p className="text-muted-foreground">
                        Manage your account settings and preferences.
                    </p>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    <aside className="lg:w-1/4 xl:w-1/5">
                        <SettingsNavigation />
                    </aside>
                    <div className="flex-1 lg:max-w-4xl">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
