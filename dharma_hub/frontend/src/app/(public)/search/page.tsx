"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Search,
  BookOpen,
  FileText,
  PlayCircle,
  Calendar,
  Newspaper,
  ArrowRight,
} from "lucide-react";
import { api } from "@/services/api";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import { PageLoading } from "@/components/ui/Skeleton";

function SearchInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQ = searchParams.get("q") || "";

  const [query, setQuery] = useState(initialQ);
  const [searchQuery, setSearchQuery] = useState(initialQ);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const q = searchParams.get("q") || "";
    setQuery(q);
    setSearchQuery(q);
  }, [searchParams]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults(null);
      return;
    }

    setLoading(true);
    setError("");
    async function executeSearch() {
      try {
        const data = await api(`/public/search?q=${encodeURIComponent(searchQuery.trim())}`);
        setResults(data);
      } catch (err: any) {
        setError(err?.message || "Lỗi tìm kiếm.");
        setResults(null);
      } finally {
        setLoading(false);
      }
    }
    executeSearch();
  }, [searchQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    setSearchQuery(q);
    router.replace(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
  };

  const hasResults = () => {
    if (!results) return false;
    return (
      results.sutras?.length > 0 ||
      results.articles?.length > 0 ||
      results.lectures?.length > 0 ||
      results.news?.length > 0 ||
      results.retreats?.length > 0
    );
  };

  const ResultBlock = ({
    title,
    icon,
    items,
    hrefOf,
    subtitleOf,
    cta,
  }: {
    title: string;
    icon: React.ReactNode;
    items: any[];
    hrefOf: (i: any) => string;
    subtitleOf?: (i: any) => string;
    cta: string;
  }) => (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
      <h2 className="flex items-center text-sm font-bold text-primary uppercase font-serif tracking-wider border-b border-border/40 pb-2">
        {icon}
        <span className="ml-1.5">
          {title} ({items.length})
        </span>
      </h2>
      <div className="divide-y divide-border/40">
        {items.map((item) => (
          <div
            key={item.id}
            className="py-3.5 first:pt-0 last:pb-0 flex justify-between items-center gap-4"
          >
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-foreground">{item.title}</h3>
              {subtitleOf && (
                <p className="text-xs text-muted mt-1 truncate max-w-xl">{subtitleOf(item)}</p>
              )}
            </div>
            <Link
              href={hrefOf(item)}
              className="flex items-center text-xs font-bold text-primary hover:underline shrink-0 min-h-10"
            >
              <span>{cta}</span>
              <ArrowRight size={13} className="ml-0.5" aria-hidden />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 space-y-8 fade-in">
      <PageHeader
        title="Tra Cứu Pháp Bảo"
        description="Tìm kiếm văn bản kinh điển, pháp thoại của giảng sư, lịch sự kiện và tin tức trong toàn bộ hệ thống."
      />

      <form onSubmit={handleSearchSubmit} className="relative flex items-center w-full max-w-2xl mx-auto">
        <span className="absolute left-4 text-muted-foreground" aria-hidden>
          <Search size={22} />
        </span>
        <input
          required
          type="search"
          placeholder="Nhập tên kinh điển, giảng sư, khóa tu, từ khóa cần tìm..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-12 pr-28 py-3.5 border border-border bg-card rounded-full text-base font-medium focus:border-primary transition-all outline-none min-h-14"
          aria-label="Từ khóa tìm kiếm"
        />
        <button
          type="submit"
          disabled={loading}
          className="absolute right-2 bg-primary text-primary-foreground hover:bg-primary/95 px-5 py-2.5 rounded-full text-xs font-bold transition-all disabled:opacity-50 min-h-10"
        >
          {loading ? "Đang tìm..." : "Tìm Kiếm"}
        </button>
      </form>

      <div className="mt-8">
        {loading && <PageLoading label="Đang tìm kiếm..." />}

        {!loading && error && (
          <EmptyState
            title="Lỗi tìm kiếm"
            description={error}
            onRetry={() => setSearchQuery(query.trim())}
          />
        )}

        {!loading && searchQuery && !error && !hasResults() && (
          <EmptyState
            title="Không tìm thấy kết quả"
            description={`Không tìm thấy tư liệu nào khớp với từ khóa "${searchQuery}". Kính mong quý Phật tử thử lại bằng từ khóa khác.`}
          />
        )}

        {!loading && results && hasResults() && (
          <div className="space-y-8">
            {results.sutras?.length > 0 && (
              <ResultBlock
                title="Kinh điển tụng đọc"
                icon={<BookOpen size={16} aria-hidden />}
                items={results.sutras}
                hrefOf={(s) => `/sutras/${s.slug}`}
                subtitleOf={(s) => s.summary || "Đọc bản dịch kinh..."}
                cta="Tụng kinh"
              />
            )}
            {results.articles?.length > 0 && (
              <ResultBlock
                title="Bài viết pháp học"
                icon={<FileText size={16} aria-hidden />}
                items={results.articles}
                hrefOf={(a) => `/articles/${a.slug}`}
                subtitleOf={(a) => a.excerpt}
                cta="Đọc bài"
              />
            )}
            {results.lectures?.length > 0 && (
              <ResultBlock
                title="Bài giảng thuyết pháp"
                icon={<PlayCircle size={16} aria-hidden />}
                items={results.lectures}
                hrefOf={(l) => `/lectures/${l.slug}`}
                subtitleOf={(l) => l.description}
                cta="Nghe giảng"
              />
            )}
            {results.retreats?.length > 0 && (
              <ResultBlock
                title="Khóa tu học"
                icon={<Calendar size={16} aria-hidden />}
                items={results.retreats}
                hrefOf={(r) => `/retreats/${r.slug}`}
                subtitleOf={(r) => `Địa điểm: ${r.location || "Đạo tràng chùa"}`}
                cta="Ghi danh"
              />
            )}
            {results.news?.length > 0 && (
              <ResultBlock
                title="Tin tức & thông báo"
                icon={<Newspaper size={16} aria-hidden />}
                items={results.news}
                hrefOf={(n) => `/news/${n.slug}`}
                subtitleOf={(n) => n.excerpt}
                cta="Xem tin"
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<PageLoading label="Đang mở trang tìm kiếm..." />}>
      <SearchInner />
    </Suspense>
  );
}
