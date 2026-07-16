"use client";

import React from "react";

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-muted-foreground/10 ${className}`}
      aria-hidden
    />
  );
}

export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-3 shadow-sm">
      <Skeleton className="h-40 w-full rounded-lg" />
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-5 w-3/4" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-3 w-full" />
      ))}
    </div>
  );
}

export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4" role="status" aria-label="Đang tải nội dung">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-card border border-border rounded-xl p-5 flex gap-4">
          <Skeleton className="h-16 w-16 shrink-0 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      ))}
      <span className="sr-only">Đang tải nội dung...</span>
    </div>
  );
}

export function PageLoading({ label = "Đang tải nội dung..." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3" role="status">
      <div className="w-10 h-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      <span className="text-sm font-medium text-muted">{label}</span>
    </div>
  );
}
