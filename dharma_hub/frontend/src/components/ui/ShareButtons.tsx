"use client";

import React, { useState } from "react";
import { Share2, Link2, Check } from "lucide-react";

interface ShareButtonsProps {
  title: string;
  path?: string;
}

export default function ShareButtons({ title, path }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const getUrl = () => {
    if (typeof window === "undefined") return path || "";
    return path ? `${window.location.origin}${path}` : window.location.href;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const shareFb = () => {
    const url = encodeURIComponent(getUrl());
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, "_blank", "noopener,noreferrer");
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, url: getUrl() });
      } catch {
        /* cancelled */
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={shareNative}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-border bg-card text-xs font-semibold text-muted hover:text-foreground hover:border-primary/30 transition-colors min-h-10"
        aria-label="Chia sẻ"
      >
        <Share2 size={14} />
        <span>Chia sẻ</span>
      </button>
      <button
        type="button"
        onClick={shareFb}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-border bg-card text-xs font-semibold text-muted hover:text-foreground hover:border-primary/30 transition-colors min-h-10"
        aria-label="Chia sẻ Facebook"
      >
        <span>Facebook</span>
      </button>
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-border bg-card text-xs font-semibold text-muted hover:text-foreground hover:border-primary/30 transition-colors min-h-10"
        aria-label="Sao chép liên kết"
      >
        {copied ? <Check size={14} className="text-green-600" /> : <Link2 size={14} />}
        <span>{copied ? "Đã chép" : "Sao chép link"}</span>
      </button>
    </div>
  );
}
