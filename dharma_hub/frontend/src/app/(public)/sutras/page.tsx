"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Search, ArrowRight } from "lucide-react";
import { api } from "@/services/api";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import MediaPlaceholder from "@/components/ui/MediaPlaceholder";
import { CardSkeleton } from "@/components/ui/Skeleton";

export default function SutrasListPage() {
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(9);
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCat, setSelectedCat] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/public/categories?module=sutras")
      .then((cats) => setCategories(cats || []))
      .catch(console.error);
  }, []);

  const loadSutras = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
      });
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      if (selectedCat) params.set("category_id", String(selectedCat));
      const res = await api("/public/sutras?" + params.toString());
      setItems(res.items || []);
      setTotal(res.total || 0);
    } catch (err: any) {
      setError(err?.message || "Không tải được kinh điển.");
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, selectedCat, pageSize]);

  useEffect(() => {
    loadSutras();
  }, [loadSutras]);

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 space-y-10 fade-in">
      <PageHeader
        title="Thư Viện Kinh Điển"
        description="Nơi lưu trữ và tra cứu các bài kinh văn Phật giáo chính thống bản dịch Việt ngữ."
      />

      <section className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 p-4 bg-card border border-border rounded-xl shadow-sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSearchQuery(search);
            setPage(1);
          }}
          className="relative flex-grow w-full"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} aria-hidden />
          <input
            type="search"
            placeholder="Tìm tên kinh, người dịch, nguồn gốc..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4"
            aria-label="Tìm kinh điển"
          />
        </form>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => {
              setSelectedCat(null);
              setPage(1);
            }}
            className={`px-4 py-2.5 rounded-md text-xs font-semibold border transition-all min-h-11 ${
              selectedCat === null
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted bg-background hover:bg-muted-foreground/10"
            }`}
          >
            Tất cả
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setSelectedCat(cat.id);
                setPage(1);
              }}
              className={`px-4 py-2.5 rounded-md text-xs font-semibold border transition-all min-h-11 ${
                selectedCat === cat.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted bg-background hover:bg-muted-foreground/10"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </section>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} lines={2} />
          ))}
        </div>
      ) : error ? (
        <EmptyState title="Lỗi tải dữ liệu" description={error} onRetry={loadSutras} />
      ) : items.length === 0 ? (
        <EmptyState
          title="Không tìm thấy kinh điển"
          description="Chưa tìm thấy kinh điển nào khớp với điều kiện tìm kiếm."
        />
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => (
              <article
                key={item.id}
                className="bg-card border border-border rounded-xl overflow-hidden shadow-sm flex flex-col justify-between hover:border-primary/20 transition-all"
              >
                <MediaPlaceholder
                  variant="cover"
                  src={item.cover_url}
                  alt={item.title}
                  className="border-0 border-b rounded-none aspect-[16/9]"
                />
                <div className="space-y-3 p-6 pb-0">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-mono">{item.sutra_group || "Kinh văn"}</span>
                    {item.reading_minutes && <span>{item.reading_minutes} phút đọc</span>}
                  </div>
                  <h2 className="font-serif text-lg font-bold text-foreground line-clamp-2">{item.title}</h2>
                  <p className="text-sm text-muted leading-relaxed line-clamp-3">
                    {item.summary || "Đang cập nhật tóm tắt..."}
                  </p>
                </div>
                <div className="mx-6 mt-6 pt-4 pb-6 border-t border-border/40 flex items-center justify-between text-xs gap-2">
                  <span className="text-muted-foreground truncate max-w-[150px]">
                    Dịch giả: {item.translator || "Khuyết danh"}
                  </span>
                  <Link
                    href={`/sutras/${item.slug}`}
                    className="flex items-center space-x-0.5 text-xs font-bold text-primary hover:underline shrink-0"
                  >
                    <span>Tụng đọc</span>
                    <ArrowRight size={14} aria-hidden />
                  </Link>
                </div>
              </article>
            ))}
          </div>

          {pages > 1 && (
            <div className="flex items-center justify-center space-x-3 text-sm text-muted-foreground">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-4 py-2.5 border border-border rounded-md hover:text-foreground bg-card disabled:opacity-50 transition-colors min-h-11"
              >
                Trước
              </button>
              <span className="font-mono text-foreground font-semibold">
                Trang {page} / {pages}
              </span>
              <button
                type="button"
                disabled={page >= pages}
                onClick={() => setPage(page + 1)}
                className="px-4 py-2.5 border border-border rounded-md hover:text-foreground bg-card disabled:opacity-50 transition-colors min-h-11"
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
