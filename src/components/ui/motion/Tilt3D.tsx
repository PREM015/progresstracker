'use client';

import React, { useRef } from 'react';
import { motion, useMotionTemplate, useMotionValue, useSpring } from 'framer-motion';

interface Tilt3DProps {
    children: React.ReactNode;
    className?: string;
    intensity?: number; // How much tilt applied (higher = more tilt)
}

export const Tilt3D: React.FC<Tilt3DProps> = ({
    children,
    className = '',
    intensity = 15
}) => {
    const ref = useRef<HTMLDivElement>(null);

    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const mouseX = useSpring(x, { stiffness: 150, damping: 15 });
    const mouseY = useSpring(y, { stiffness: 150, damping: 15 });

    function handleMouseMove({ clientX, clientY }: React.MouseEvent) {
        if (!ref.current) return;

        const { left, top, width, height } = ref.current.getBoundingClientRect();

        const xPct = (clientX - left) / width - 0.5;
        const yPct = (clientY - top) / height - 0.5;

        x.set(xPct);
        y.set(yPct);
    }

    function handleMouseLeave() {
        x.set(0);
        y.set(0);
    }

    const rotateX = useMotionTemplate`${mouseY.get() * intensity * -1}deg`;
    const rotateY = useMotionTemplate`${mouseX.get() * intensity}deg`;

    return (
        <motion.div
            ref={ref}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
                transformStyle: "preserve-3d",
                rotateX,
                rotateY,
            }}
            className={className}
        >
            {children}
        </motion.div>
    );
};
