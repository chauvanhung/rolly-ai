"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Calendar, Pin, ArrowRight } from "lucide-react";
import { api } from "@/services/api";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import { ListSkeleton } from "@/components/ui/Skeleton";

export default function NewsListPage() {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(6);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadNews = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
      });
      const res = await api("/public/news?" + params.toString());
      setItems(res.items || []);
      setTotal(res.total || 0);
    } catch (err: any) {
      setError(err?.message || "Không tải được tin tức.");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    loadNews();
  }, [loadNews]);

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 space-y-10 fade-in">
      <PageHeader
        title="Tin Tức & Thông Báo"
        description="Cập nhật tin hoạt động Phật sự, các khóa biểu mới và thông báo hành lễ của đạo tràng."
      />

      {loading ? (
        <ListSkeleton count={4} />
      ) : error ? (
        <EmptyState title="Lỗi tải tin" description={error} onRetry={loadNews} />
      ) : items.length === 0 ? (
        <EmptyState
          title="Chưa có tin tức"
          description="Chưa ghi nhận bản tin Phật sự nào gần đây."
        />
      ) : (
        <div className="space-y-8">
          {/* News List */}
          <div className="space-y-6">
            {items.map((item) => (
              <article
                key={item.id}
                className={`bg-card border border-border rounded-2xl p-6 shadow-sm hover:border-primary/25 transition-all relative flex flex-col justify-between ${
                  item.is_pinned ? "border-l-4 border-l-primary" : ""
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center">
                      <Calendar size={12} className="mr-1" />
                      {new Date(item.created_at).toLocaleDateString("vi-VN")}
                    </span>
                    {item.is_pinned && (
                      <span className="flex items-center text-primary font-bold space-x-0.5">
                        <Pin size={12} />
                        <span>Thông báo quan trọng</span>
                      </span>
                    )}
                  </div>
                  <h2 className="font-serif text-base font-bold text-foreground">{item.title}</h2>
                  <p className="text-sm text-muted leading-relaxed line-clamp-3">{item.excerpt}</p>
                </div>

                <div className="mt-6 pt-4 border-t border-border/40 text-right">
                  <Link
                    href={`/news/${item.slug}`}
                    className="inline-flex items-center space-x-0.5 text-xs font-bold text-primary hover:underline"
                  >
                    <span>Xem toàn văn bản</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </article>
            ))}
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-center space-x-3 text-sm text-muted-foreground">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-4 py-2 border border-border rounded-md hover:text-foreground bg-card disabled:opacity-50 transition-colors"
              >
                Trước
              </button>
              <span className="font-mono text-foreground font-semibold">Trang {page} / {pages}</span>
              <button
                disabled={page >= pages}
                onClick={() => setPage(page + 1)}
                className="px-4 py-2 border border-border rounded-md hover:text-foreground bg-card disabled:opacity-50 transition-colors"
              >
                Sau
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
