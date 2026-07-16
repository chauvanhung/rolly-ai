"use client";

import React from "react";
import { RefreshCw, Inbox } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  icon?: React.ReactNode;
}

export default function EmptyState({
  title = "Chưa có nội dung",
  description = "Kính mong quý Phật tử quay lại sau hoặc thử thao tác khác.",
  onRetry,
  retryLabel = "Thử lại",
  icon,
}: EmptyStateProps) {
  return (
    <div className="text-center py-16 px-6 bg-card border border-border border-dashed rounded-2xl space-y-3">
      <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
        {icon || <Inbox size={22} />}
      </div>
      <h3 className="font-serif text-base font-bold text-foreground">{title}</h3>
      <p className="text-sm text-muted max-w-md mx-auto leading-relaxed">{description}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 mt-2 px-4 py-2 rounded-full border border-border bg-background text-sm font-semibold text-foreground hover:border-primary/40 hover:text-primary transition-colors min-h-11"
        >
          <RefreshCw size={14} />
          <span>{retryLabel}</span>
        </button>
      )}
    </div>
  );
}
