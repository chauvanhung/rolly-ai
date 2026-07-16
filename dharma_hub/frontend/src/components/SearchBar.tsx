"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Loader2, BookOpen, FileText, PlayCircle, Calendar, Newspaper, X } from "lucide-react";
import { api } from "../services/api";

interface SearchBarProps {
  autoFocus?: boolean;
  onNavigate?: () => void;
}

export default function SearchBar({ autoFocus = false, onNavigate }: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const delayDebounce = setTimeout(async () => {
      try {
        const data = await api(`/public/search?q=${encodeURIComponent(query.trim())}`);
        setResults(data);
      } catch (err) {
        console.error("Search error:", err);
        setResults(null);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [query]);

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

  const goFullSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setOpen(false);
    onNavigate?.();
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const ResultGroup = ({
    title,
    icon,
    items,
    hrefOf,
    subtitleOf,
  }: {
    title: string;
    icon: React.ReactNode;
    items: any[];
    hrefOf: (item: any) => string;
    subtitleOf?: (item: any) => string | undefined;
  }) => (
    <div>
      <h4 className="flex items-center text-xs font-bold text-primary uppercase font-serif tracking-wider mb-2 border-b border-border/40 pb-1">
        {icon}
        <span className="ml-1">
          {title} ({items.length})
        </span>
      </h4>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={hrefOf(item)}
              onClick={() => {
                setOpen(false);
                onNavigate?.();
              }}
              className="block text-sm text-foreground hover:text-primary transition-colors hover:bg-muted-foreground/5 p-2 rounded-md"
            >
              <p className="font-semibold">{item.title}</p>
              {subtitleOf?.(item) && <p className="text-xs text-muted truncate">{subtitleOf(item)}</p>}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl mx-auto">
      <form onSubmit={goFullSearch} className="relative flex items-center w-full">
        <span className="absolute left-3 text-muted-foreground" aria-hidden>
          <Search size={18} />
        </span>
        <input
          ref={inputRef}
          type="search"
          placeholder="Tìm kinh điển, bài giảng, khóa tu..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="w-full pl-10 pr-10 py-2.5 border border-border bg-card rounded-full text-sm font-medium focus:border-primary transition-all min-h-11"
          aria-label="Tìm kiếm toàn trang"
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setResults(null);
              inputRef.current?.focus();
            }}
            className="absolute right-3 text-muted hover:text-foreground p-1"
            aria-label="Xóa từ khóa"
          >
            <X size={16} />
          </button>
        )}
      </form>

      {open && query.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-lg z-50 max-h-[450px] overflow-y-auto p-4 fade-in">
          {loading && (
            <div className="flex items-center justify-center py-6 text-muted">
              <Loader2 className="animate-spin mr-2" size={18} />
              <span className="text-sm">Đang tìm...</span>
            </div>
          )}

          {!loading && !hasResults() && (
            <div className="text-center py-6 space-y-2">
              <p className="text-muted-foreground text-sm">Không tìm thấy kết quả phù hợp.</p>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onNavigate?.();
                  router.push(`/search?q=${encodeURIComponent(query.trim())}`);
                }}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Mở trang tìm kiếm đầy đủ
              </button>
            </div>
          )}

          {!loading && results && hasResults() && (
            <div className="space-y-4">
              {results.sutras?.length > 0 && (
                <ResultGroup
                  title="Kinh điển"
                  icon={<BookOpen size={12} />}
                  items={results.sutras}
                  hrefOf={(s) => `/sutras/${s.slug}`}
                  subtitleOf={(s) => (s.translator ? `Dịch giả: ${s.translator}` : undefined)}
                />
              )}
              {results.articles?.length > 0 && (
                <ResultGroup
                  title="Bài pháp"
                  icon={<FileText size={12} />}
                  items={results.articles}
                  hrefOf={(a) => `/articles/${a.slug}`}
                  subtitleOf={(a) => a.excerpt}
                />
              )}
              {results.lectures?.length > 0 && (
                <ResultGroup
                  title="Bài giảng"
                  icon={<PlayCircle size={12} />}
                  items={results.lectures}
                  hrefOf={(l) => `/lectures/${l.slug}`}
                  subtitleOf={(l) => l.series_name}
                />
              )}
              {results.retreats?.length > 0 && (
                <ResultGroup
                  title="Khóa tu"
                  icon={<Calendar size={12} />}
                  items={results.retreats}
                  hrefOf={(r) => `/retreats/${r.slug}`}
                  subtitleOf={(r) => r.location}
                />
              )}
              {results.news?.length > 0 && (
                <ResultGroup
                  title="Tin tức"
                  icon={<Newspaper size={12} />}
                  items={results.news}
                  hrefOf={(n) => `/news/${n.slug}`}
                />
              )}
              <div className="pt-2 border-t border-border text-center">
                <Link
                  href={`/search?q=${encodeURIComponent(query.trim())}`}
                  onClick={() => {
                    setOpen(false);
                    onNavigate?.();
                  }}
                  className="text-xs font-bold text-primary hover:underline"
                >
                  Xem tất cả kết quả →
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
