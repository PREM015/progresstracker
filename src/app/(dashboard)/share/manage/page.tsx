'use client';

import React from 'react';
import { useShare } from '@/hooks';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Share2, Link as LinkIcon, Eye, Trash2, ExternalLink, Calendar } from 'lucide-react';
import { toast } from 'sonner';

export default function ShareManagementPage() {
  const { links, isLoading, revokeShare, isRevoking } = useShare();

  const handleRevoke = async (id: string) => {
    try {
      await revokeShare(id);
      toast.success('Share link revoked successfully');
    } catch (err) {
      toast.error('Failed to revoke share link');
    }
  };

  return (
    <div className="min-h-screen p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Share Management</h1>
        <p className="text-zinc-400 max-w-2xl">
          Track and manage your public share links and their statistics.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-zinc-900/50 animate-pulse rounded-xl border border-white/5" />
          ))}
        </div>
      ) : links.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {links.map((link) => (
            <GlassCard key={link.id} className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 shrink-0">
                    <Share2 className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-white text-lg capitalize">{link.type} Share</h3>
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                        {link.status}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-500 font-medium">
                      <span className="flex items-center gap-1.5">
                        <LinkIcon className="w-3.5 h-3.5" />
                        {link.code}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        Created {new Date(link.createdAt).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5" />
                        {link.viewCount} views
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end md:self-center">
                  <Button variant="outline" size="sm" className="bg-zinc-800/50 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white" asChild>
                    <a href={link.fullUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View Link
                    </a>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="bg-red-500/5 border-red-500/20 text-red-500 hover:bg-red-500/10"
                    onClick={() => handleRevoke(link.id)}
                    disabled={isRevoking}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Revoke
                  </Button>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      ) : (
        <GlassCard className="p-12 text-center border-dashed border-white/10 bg-transparent">
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 rounded-full bg-zinc-900 text-zinc-500">
              <Share2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">No share links yet</h3>
              <p className="text-zinc-500 mt-1">Share your profile or achievements to see them here.</p>
            </div>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
