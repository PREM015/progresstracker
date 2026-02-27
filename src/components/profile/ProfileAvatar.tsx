'use client';

import React, { useState } from 'react';

interface ProfileAvatarProps {
    imageUrl?: string;
    name: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    editable?: boolean;
    onUpload?: (file: File) => void;
    className?: string;
}

export const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
    imageUrl,
    name,
    size = 'md',
    editable = false,
    onUpload,
    className = '',
}) => {
    const sizes = {
        sm: 'w-12 h-12 text-lg',
        md: 'w-20 h-20 text-2xl',
        lg: 'w-32 h-32 text-4xl',
        xl: 'w-48 h-48 text-6xl',
    };

    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && onUpload) {
            onUpload(file);
        }
    };

    return (
        <div className={`relative ${className}`}>
            <div className={`${sizes[size]} rounded-full flex items-center justify-center font-bold text-white bg-gradient-to-br from-indigo-500 to-purple-500 overflow-hidden`}>
                {imageUrl ? (
                    <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
                ) : (
                    initials
                )}
            </div>

            {editable && (
                <label className="absolute bottom-0 right-0 bg-white border-2 border-gray-200 rounded-full p-2 cursor-pointer hover:bg-gray-50">
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                    <span>📷</span>
                </label>
            )}
        </div>
    );
};

export default ProfileAvatar;
