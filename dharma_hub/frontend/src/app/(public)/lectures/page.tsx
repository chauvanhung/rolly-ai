"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Headphones, Search, ArrowRight, Video, User } from "lucide-react";
import { api } from "@/services/api";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import { CardSkeleton } from "@/components/ui/Skeleton";

export default function LecturesListPage() {
  const [items, setItems] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(6);
  
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState<number | null>(null);
  const [selectedKind, setSelectedKind] = useState<string>(""); // "" | "video" | "audio"
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/public/teachers")
      .then((data) => setTeachers(Array.isArray(data) ? data : data?.items || []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    async function loadLectures() {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({
          page: String(page),
          page_size: String(pageSize),
        });
        if (searchQuery.trim()) params.set("search", searchQuery.trim());
        if (selectedTeacher) params.set("teacher_id", String(selectedTeacher));
        if (selectedKind) params.set("kind", selectedKind);

        const res = await api("/public/lectures?" + params.toString());
        setItems(res.items || []);
        setTotal(res.total || 0);
      } catch (err: any) {
        setError(err?.message || "Không tải được bài giảng.");
      } finally {
        setLoading(false);
      }
    }
    loadLectures();
  }, [page, searchQuery, selectedTeacher, selectedKind, pageSize]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(search);
    setPage(1);
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "—";
    const mins = Math.floor(seconds / 60);
    return `${mins} phút`;
  };

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 space-y-10 fade-in">
      <PageHeader
        title="Học Pháp & Nghe Giảng"
        description="Thư viện bài giảng video thuyết pháp và audio pháp thoại từ các vị giảng sư tôn kính."
      />

      {/* Toolbar Filters */}
      <section className="flex flex-col md:flex-row items-center gap-4 p-4 bg-card border border-border rounded-xl shadow-sm">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative flex-grow w-full">
          <Search className="absolute left-3 top-2.5 text-muted-foreground" size={18} />
          <input
            type="text"
            placeholder="Tìm tên bài giảng, chuỗi pháp thoại..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-border bg-background rounded-md text-sm outline-none focus:border-primary"
          />
        </form>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {/* Teacher filter */}
          <select
            value={selectedTeacher || ""}
            onChange={(e) => {
              setSelectedTeacher(e.target.value ? Number(e.target.value) : null);
              setPage(1);
            }}
            className="border border-border bg-background rounded-md px-3 py-2 text-xs font-semibold focus:border-primary outline-none"
          >
            <option value="">Tất cả giảng sư</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          {/* Media kind filter */}
          <select
            value={selectedKind}
            onChange={(e) => {
              setSelectedKind(e.target.value);
              setPage(1);
            }}
            className="border border-border bg-background rounded-md px-3 py-2 text-xs font-semibold focus:border-primary outline-none"
          >
            <option value="">Tất cả định dạng</option>
            <option value="video">Video giảng thuyết</option>
            <option value="audio">Audio pháp thoại</option>
          </select>
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
        <EmptyState title="Lỗi tải bài giảng" description={error} />
      ) : items.length === 0 ? (
        <EmptyState title="Chưa có bài giảng" description="Chưa tìm thấy bài giảng nào phù hợp." />
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {items.map((item) => {
              const isVideo = Boolean(item.video_url);
              return (
                <div key={item.id} className="bg-card border border-border rounded-xl overflow-hidden shadow-sm flex flex-col justify-between hover:border-primary/20 transition-all">
                  <div>
                    {/* Media Type Header image/color */}
                    <div className="w-full h-40 border-b border-border relative overflow-hidden">
                      {item.cover_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.cover_url}
                          alt={item.title}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          {isVideo ? (
                            <Video size={40} className="text-primary/20" />
                          ) : (
                            <Headphones size={40} className="text-primary/20" />
                          )}
                        </div>
                      )}
                      <span className="absolute top-2 left-2 flex items-center space-x-1 rounded bg-background/80 text-[10px] px-2 py-0.5 font-bold">
                        {isVideo ? <Video size={11} /> : <Headphones size={11} />}
                        <span>{isVideo ? "Video" : "Audio"}</span>
                      </span>
                      <span className="absolute bottom-2 right-2 rounded bg-background/80 text-[10px] px-2 py-0.5 font-bold font-mono">
                        {formatDuration(item.duration_seconds)}
                      </span>
                    </div>

                    <div className="p-5 space-y-2.5">
                      <div className="flex items-center space-x-1 text-xs text-primary font-bold">
                        {isVideo ? <Video size={13} /> : <Headphones size={13} />}
                        <span>{isVideo ? "Video giảng" : "Audio pháp thoại"}</span>
                      </div>
                      <h2 className="font-serif text-sm font-bold text-foreground line-clamp-2">{item.title}</h2>
                      <p className="text-sm text-muted leading-relaxed line-clamp-3">{item.description || "Nghe và tu học chánh pháp..."}</p>
                    </div>
                  </div>

                  <div className="p-5 pt-0 flex items-center justify-between text-xs border-t border-border/20 mt-4 pt-4">
                    <span className="flex items-center text-muted-foreground max-w-[150px] truncate">
                      <User size={12} className="mr-1" />
                      <span>{item.teacher_name || "Giảng sư"}</span>
                    </span>
                    <Link href={`/lectures/${item.slug}`} className="flex items-center space-x-0.5 text-xs font-bold text-primary hover:underline">
                      <span>Xem chi tiết</span>
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              );
            })}
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
