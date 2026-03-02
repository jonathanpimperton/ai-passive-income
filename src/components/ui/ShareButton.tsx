import { useState, useRef, useEffect, useCallback } from 'react';
import { Share2, Link, Check } from 'lucide-react';

interface ShareButtonProps {
  toolSlug: string;
  toolName: string;
}

/** Inline SVG icons for platforms without Lucide equivalents */
const TwitterIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const FacebookIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 1.09.07 1.373.14V7.9a8 8 0 0 0-.73-.034c-1.032 0-1.432.393-1.432 1.414v2.764h2.05l-.394 3.667h-1.656v8.118A12.02 12.02 0 0 0 12 24c-.34 0-.675-.014-1.007-.042a12 12 0 0 1-1.892-.267" />
  </svg>
);

const LinkedInIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065m1.782 13.019H3.555V9h3.564zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0z" />
  </svg>
);

const RedditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0m6.066 13.71c.147.307.216.636.216.978 0 1.126-.556 2.144-1.476 2.922C15.906 18.39 14.05 18.87 12 18.87s-3.906-.48-4.806-1.26c-.92-.778-1.476-1.796-1.476-2.922 0-.342.07-.671.216-.978a1.94 1.94 0 0 1-.07-.497c0-1.09.886-1.976 1.977-1.976.548 0 1.044.222 1.4.583A8.8 8.8 0 0 1 12 11.16c1.1 0 2.16.228 3.122.634.005-.003.01-.006.017-.01.356-.346.845-.56 1.384-.56 1.09 0 1.976.886 1.976 1.976 0 .174-.023.343-.066.497.14.16.252.34.335.537-.003-.003-.003-.01-.003-.017.003.01.003.01.003.01v.003zM9.6 14.4a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4m4.8 0a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4m-4.687 2.184c.61.456 1.397.696 2.287.696s1.677-.24 2.287-.696a.48.48 0 1 0-.574-.768c-.424.317-1.014.504-1.713.504s-1.289-.187-1.713-.504a.48.48 0 0 0-.574.768M20.16 4.8a1.44 1.44 0 1 0-2.88 0c0 .55.31 1.026.764 1.268-.008.072-.012.144-.012.216 0 .264.036.522.096.768a9.6 9.6 0 0 0-3.648-.72L16.56 3.6l2.16.72a1.44 1.44 0 0 0 1.44 1.44z" />
  </svg>
);

type Platform = 'copy' | 'twitter' | 'facebook' | 'linkedin' | 'reddit';

export default function ShareButton({ toolSlug, toolName }: ShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const getShareUrl = useCallback(() => {
    const url = new URL(window.location.href);
    url.hash = '';
    url.search = '';
    return url.toString();
  }, []);

  const shareText = `Check out this free ${toolName} from CalcRun`;

  const fireGa4Event = useCallback((platform: Platform) => {
    if (typeof window !== 'undefined' && typeof (window as Record<string, unknown>).gtag === 'function') {
      (window as Record<string, (...args: unknown[]) => void>).gtag('event', 'share_tool', {
        event_label: platform,
        tool_slug: toolSlug,
      });
    }
  }, [toolSlug]);

  const handleCopyLink = useCallback(async () => {
    const url = getShareUrl();
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = url;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
    setCopied(true);
    fireGa4Event('copy');
    setTimeout(() => setCopied(false), 2000);
  }, [getShareUrl, fireGa4Event]);

  const handleShare = useCallback((platform: Platform) => {
    const url = encodeURIComponent(getShareUrl());
    const text = encodeURIComponent(shareText);

    const shareUrls: Record<Exclude<Platform, 'copy'>, string> = {
      twitter: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      reddit: `https://www.reddit.com/submit?url=${url}&title=${text}`,
    };

    fireGa4Event(platform);
    window.open(shareUrls[platform], '_blank', 'noopener,width=600,height=500');
    setOpen(false);
  }, [getShareUrl, shareText, fireGa4Event]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const menuItems: Array<{ platform: Platform; label: string; icon: React.ReactNode }> = [
    { platform: 'copy', label: copied ? 'Copied!' : 'Copy link', icon: copied ? <Check size={16} aria-hidden="true" /> : <Link size={16} aria-hidden="true" /> },
    { platform: 'twitter', label: 'Twitter / X', icon: <TwitterIcon /> },
    { platform: 'facebook', label: 'Facebook', icon: <FacebookIcon /> },
    { platform: 'linkedin', label: 'LinkedIn', icon: <LinkedInIcon /> },
    { platform: 'reddit', label: 'Reddit', icon: <RedditIcon /> },
  ];

  return (
    <div ref={containerRef} className="relative" data-pdf-hide>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 text-primary-600 bg-primary-50 border border-primary-200/60 hover:bg-primary-100"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Share this calculator"
      >
        <Share2 size={16} aria-hidden="true" />
        Share
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-52 bg-white border border-neutral-200/80 rounded-xl shadow-lg p-1.5 z-20"
          role="menu"
          aria-label="Share options"
        >
          {menuItems.map((item) => (
            <button
              key={item.platform}
              type="button"
              role="menuitem"
              onClick={() => item.platform === 'copy' ? handleCopyLink() : handleShare(item.platform)}
              className={`flex items-center gap-3 w-full px-3 py-2.5 text-sm rounded-lg transition-colors duration-150 ${
                item.platform === 'copy' && copied
                  ? 'text-accent-600 bg-accent-50'
                  : 'text-neutral-700 hover:bg-primary-50 hover:text-primary-600'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
