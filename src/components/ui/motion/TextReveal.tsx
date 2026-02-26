'use client';

import React from 'react';
import { motion, Variants } from 'framer-motion';
import { cn } from '@/lib/utils';

interface TextRevealProps {
    text: string;
    className?: string;
    delay?: number;
}

export const TextReveal: React.FC<TextRevealProps> = ({
    text,
    className = '',
    delay = 0,
}) => {
    const words = text.split(" ");

    const container: Variants = {
        hidden: { opacity: 0 },
        visible: (i = 1) => ({
            opacity: 1,
            transition: { staggerChildren: 0.12, delayChildren: 0.04 * i + delay },
        }),
    };

    const child: Variants = {
        visible: {
            opacity: 1,
            x: 0,
            y: 0,
            transition: {
                type: "spring",
                damping: 12,
                stiffness: 100,
            },
        },
        hidden: {
            opacity: 0,
            x: -20,
            y: 10,
            transition: {
                type: "spring",
                damping: 12,
                stiffness: 100,
            },
        },
    };

    return (
        <motion.div
            variants={container}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className={cn("flex flex-wrap", className)}
        >
            {words.map((word, index) => (
                <motion.span variants={child} key={index} className="mr-[0.2em]">
                    {word}
                </motion.span>
            ))}
        </motion.div>
    );
};
