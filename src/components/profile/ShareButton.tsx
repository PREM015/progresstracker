// src/components/profile/ShareButton.tsx

'use client';

import { useState } from 'react';
import { Share2, Check, Copy } from 'lucide-react';
import  Button  from '@/components/ui/Button';
import { Dropdown } from '@/components/ui/Dropdown';
import { useToast } from '@/hooks/useToast';

interface ShareButtonProps {
  username: string;
  title?: string;
  className?: string;
}

export function ShareButton({ 
  username, 
  title = 'Check out my CodeSync profile!',
  className 
}: ShareButtonProps) {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);

  const profileUrl = `${window.location.origin}/${username}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      showToast('Profile link copied to clipboard', 'success');
      
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      showToast('Failed to copy link', 'error');
    }
  };

  const handleShareTwitter = () => {
    const text = encodeURIComponent(title);
    const url = encodeURIComponent(profileUrl);
    window.open(
      `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      '_blank',
      'width=550,height=420'
    );
  };

  const handleShareLinkedIn = () => {
    const url = encodeURIComponent(profileUrl);
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      '_blank',
      'width=550,height=420'
    );
  };

  const handleShareFacebook = () => {
    const url = encodeURIComponent(profileUrl);
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      '_blank',
      'width=550,height=420'
    );
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          url: profileUrl,
        });
      } catch (error) {
        // User cancelled or error occurred
        console.error('Share failed:', error);
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <Dropdown
      trigger={
        <Button variant="outline" className={className}>
          <Share2 className="h-4 w-4 mr-2" />
          Share Profile
        </Button>
      }
    >
      <div className="w-56 p-2">
        <button
          onClick={handleCopyLink}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg hover:bg-muted transition-colors"
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          <span>{copied ? 'Copied!' : 'Copy Link'}</span>
        </button>

        <div className="border-t my-2" />

        <button
          onClick={handleShareTwitter}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg hover:bg-muted transition-colors"
        >
          <Twitter className="h-4 w-4" />
          <span>Share on Twitter</span>
        </button>

        <button
          onClick={handleShareLinkedIn}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg hover:bg-muted transition-colors"
        >
          <Linkedin className="h-4 w-4" />
          <span>Share on LinkedIn</span>
        </button>

        <button
          onClick={handleShareFacebook}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg hover:bg-muted transition-colors"
        >
          <Facebook className="h-4 w-4" />
          <span>Share on Facebook</span>
        </button>

        {navigator.share && (
          <>
            <div className="border-t my-2" />
            <button
              onClick={handleNativeShare}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg hover:bg-muted transition-colors"
            >
              <Share2 className="h-4 w-4" />
              <span>More Options</span>
            </button>
          </>
        )}
      </div>
    </Dropdown>
  );
}