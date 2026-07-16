"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Search, ArrowRight, Calendar, User } from "lucide-react";
import { api } from "@/services/api";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import { CardSkeleton } from "@/components/ui/Skeleton";
import MediaPlaceholder from "@/components/ui/MediaPlaceholder";

export default function ArticlesListPage() {
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(6);
  
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCat, setSelectedCat] = useState<number | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/public/categories?module=dharma_talks")
      .then((cats) => setCategories(cats || []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    async function loadArticles() {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({
          page: String(page),
          page_size: String(pageSize),
        });
        if (searchQuery.trim()) params.set("search", searchQuery.trim());
        if (selectedCat) params.set("category_id", String(selectedCat));

        const res = await api("/public/articles?" + params.toString());
        setItems(res.items || []);
        setTotal(res.total || 0);
      } catch (err: any) {
        setError(err?.message || "Không tải được bài pháp.");
      } finally {
        setLoading(false);
      }
    }
    loadArticles();
  }, [page, searchQuery, selectedCat, pageSize]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(search);
    setPage(1);
  };

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 space-y-10 fade-in">
      <PageHeader
        title="Bài Pháp Học & Tu"
        description="Chia sẻ giáo lý Phật học căn bản, chánh pháp ứng dụng vào cuộc sống gia đình và tinh thần tỉnh thức hằng ngày."
      />

      {/* Toolbar */}
      <section className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-card border border-border rounded-xl shadow-sm">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative flex-grow w-full">
          <Search className="absolute left-3 top-2.5 text-muted-foreground" size={18} />
          <input
            type="text"
            placeholder="Tìm chủ đề bài pháp, giáo lý..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-border bg-background rounded-md text-sm outline-none focus:border-primary"
          />
        </form>

        {/* Categories */}
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button
            onClick={() => {
              setSelectedCat(null);
              setPage(1);
            }}
            className={`px-4 py-2 rounded-md text-xs font-semibold border transition-all ${
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
              onClick={() => {
                setSelectedCat(cat.id);
                setPage(1);
              }}
              className={`px-4 py-2 rounded-md text-xs font-semibold border transition-all ${
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

      {/* Grid rendering */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <EmptyState title="Lỗi tải bài pháp" description={error} />
      ) : items.length === 0 ? (
        <EmptyState title="Chưa có bài pháp" description="Chưa có bài viết pháp thoại nào phù hợp." />
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {items.map((item) => (
              <article key={item.id} className="bg-card border border-border rounded-xl overflow-hidden shadow-sm flex flex-col justify-between hover:border-primary/20 transition-all">
                <div>
                  <MediaPlaceholder variant="banner" src={item.cover_url} alt={item.title} className="border-0 border-b rounded-none" />
                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-semibold text-primary">{item.category_name || "Phật Pháp"}</span>
                      <span className="flex items-center"><Calendar size={12} className="mr-1" aria-hidden />{new Date(item.created_at).toLocaleDateString("vi-VN")}</span>
                    </div>
                    <h2 className="font-serif text-base font-bold text-foreground line-clamp-2">{item.title}</h2>
                    <p className="text-sm text-muted leading-relaxed line-clamp-3">{item.excerpt || "Xem nội dung giáo lý và thiền tập..."}</p>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="p-5 pt-0 flex items-center justify-between text-xs border-t border-border/20 mt-4 pt-4">
                  <span className="flex items-center text-muted-foreground">
                    <User size={12} className="mr-1" />
                    <span>{item.author_name || "Giảng sư"}</span>
                  </span>
                  <Link href={`/articles/${item.slug}`} className="flex items-center space-x-0.5 text-xs font-bold text-primary hover:underline">
                    <span>Đọc tiếp</span>
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
