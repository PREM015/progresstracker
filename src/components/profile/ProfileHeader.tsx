'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Link as LinkIcon, Calendar, Edit3, Github, Twitter, Linkedin, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/common/Avatar';

interface ProfileHeaderProps {
  user: {
    name: string;
    username: string;
    bio?: string;
    avatar?: string;
    banner?: string;
    location?: string;
    website?: string;
    joinedAt: string;
    socials?: {
      github?: string;
      twitter?: string;
      linkedin?: string;
    }
  };
  isOwnProfile?: boolean;
  className?: string;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  user,
  isOwnProfile = false,
  className = '',
}) => {
  return (
    <div className={`relative mb-8 ${className}`}>
      {/* Banner Image */}
      <div className="h-48 md:h-64 w-full rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 relative group">
        {user.banner ? (
          <img src={user.banner} alt="Profile Banner" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
        )}
        {isOwnProfile && (
          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button size="sm" variant="secondary" className="bg-white/80 backdrop-blur-sm hover:bg-white">
              <Edit3 className="w-4 h-4 mr-2" />
              Edit Banner
            </Button>
          </div>
        )}
      </div>

      {/* Profile Info Section */}
      <div className="px-4 md:px-8 pb-4">
        <div className="relative flex flex-col md:flex-row items-end -mt-16 mb-4 gap-6">
          {/* Avatar */}
          <div className="relative group">
            <div className="w-32 h-32 rounded-full border-4 border-white dark:border-zinc-950 bg-white dark:bg-zinc-950 overflow-hidden shadow-xl">
              <Avatar
                src={user.avatar}
                alt={user.name}
                fallback={user.name}
                className="w-full h-full text-4xl"
              />
            </div>
            {isOwnProfile && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Edit3 className="w-6 h-6 text-white" />
              </div>
            )}
          </div>

          {/* Actions (Desktop) */}
          <div className="flex-1 hidden md:flex justify-end gap-3 mb-2">
            {isOwnProfile ? (
              <Button variant="outline" className="rounded-full border-zinc-300 dark:border-zinc-700">
                Edit Profile
              </Button>
            ) : (
              <Button className="rounded-full bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900">
                Follow
              </Button>
            )}
          </div>
        </div>

        {/* User Details */}
        <div className="space-y-4">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              {user.name}
              {isOwnProfile && <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-medium">You</span>}
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 font-medium text-lg">@{user.username}</p>
          </div>

          {user.bio && (
            <p className="text-zinc-700 dark:text-zinc-300 max-w-2xl text-base leading-relaxed">
              {user.bio}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-zinc-500 dark:text-zinc-400">
            {user.location && (
              <div className="flex items-center gap-1.5 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors">
                <MapPin className="w-4 h-4" />
                {user.location}
              </div>
            )}
            {user.website && (
              <div className="flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                <LinkIcon className="w-4 h-4" />
                <a href={user.website} target="_blank" rel="noopener noreferrer" className="hover:underline">
                  {user.website.replace(/^https?:\/\//, '')}
                </a>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              Joined {new Date(user.joinedAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </div>
          </div>

          {/* Social Links */}
          <div className="flex items-center gap-4 pt-2">
            {user.socials?.github && (
              <a href={`https://github.com/${user.socials.github}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-black dark:hover:text-white transition-all">
                <Github className="w-5 h-5" />
              </a>
            )}
            {user.socials?.twitter && (
              <a href={`https://twitter.com/${user.socials.twitter}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all">
                <Twitter className="w-5 h-5" />
              </a>
            )}
            {user.socials?.linkedin && (
              <a href={user.socials.linkedin} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all">
                <Linkedin className="w-5 h-5" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileHeader;
