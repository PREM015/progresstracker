import { cn } from "@/lib/utils";
import { GlassCard } from "@/components/ui/GlassCard";

export const BentoGrid = ({
    className,
    children,
}: {
    className?: string;
    children?: React.ReactNode;
}) => {
    return (
        <div
            className={cn(
                "grid md:auto-rows-[18rem] grid-cols-1 md:grid-cols-3 gap-6 max-w-7xl mx-auto",
                className
            )}
        >
            {children}
        </div>
    );
};

import { Tilt3D } from "@/components/ui/motion/Tilt3D";
import { Spotlight } from "@/components/ui/motion/Spotlight";

export const BentoGridItem = ({
    className,
    title,
    description,
    header,
    icon,
    onClick,
}: {
    className?: string;
    title?: string | React.ReactNode;
    description?: string | React.ReactNode;
    header?: React.ReactNode;
    icon?: React.ReactNode;
    onClick?: () => void;
}) => {
    return (
        <Tilt3D className={cn("row-span-1 rounded-xl group/bento transition duration-200", className)} intensity={5}>
            <Spotlight className="h-full w-full" fill="rgba(160, 124, 254, 0.15)">
                <GlassCard
                    className="h-full w-full p-6 flex flex-col justify-between border- transparent bg-transparent hover:shadow-none hover:bg-transparent"
                    onClick={onClick}
                >
                    <div className="w-full transition duration-300 flex flex-col h-full z-10 relative">
                        {header}
                        <div className="group-hover/bento:translate-x-2 transition duration-300 ease-out mt-4">
                            <div className="mb-2 mt-2 w-10 h-10 rounded-full flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 group-hover/bento:rotate-12 transition-transform duration-300">
                                {icon}
                            </div>
                            <div className="font-sans font-bold text-foreground mb-2 text-lg">
                                {title}
                            </div>
                            <div className="font-sans font-normal text-muted-foreground text-sm leading-relaxed">
                                {description}
                            </div>
                        </div>
                    </div>
                </GlassCard>
            </Spotlight>
        </Tilt3D>
    );
};
