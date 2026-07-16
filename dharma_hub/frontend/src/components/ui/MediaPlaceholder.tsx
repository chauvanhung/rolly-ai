"use client";

import React from "react";

type Variant = "cover" | "thumb" | "avatar" | "banner";

const sizeMap: Record<Variant, string> = {
  cover: "w-full aspect-video text-5xl sm:text-6xl",
  thumb: "w-16 h-16 text-xl shrink-0",
  avatar: "w-24 h-24 text-3xl shrink-0 rounded-full",
  banner: "w-full h-44 text-4xl",
};

interface MediaPlaceholderProps {
  variant?: Variant;
  src?: string | null;
  alt?: string;
  label?: string;
  className?: string;
  badge?: React.ReactNode;
}

export default function MediaPlaceholder({
  variant = "cover",
  src,
  alt = "",
  label,
  className = "",
  badge,
}: MediaPlaceholderProps) {
  const base =
    "relative overflow-hidden bg-gradient-to-br from-primary/10 via-secondary/5 to-calm/10 border border-border flex items-center justify-center select-none";

  if (src) {
    return (
      <div className={`${base} ${sizeMap[variant]} ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="absolute inset-0 w-full h-full object-cover" />
        {badge}
      </div>
    );
  }

  return (
    <div className={`${base} ${sizeMap[variant]} ${className}`}>
      <span className="text-primary/25 font-serif leading-none" aria-hidden>
        ☸
      </span>
      {label && (
        <span className="absolute bottom-2 left-2 right-2 text-[10px] text-muted-foreground text-center truncate">
          {label}
        </span>
      )}
      {badge}
    </div>
  );
}
