"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Download, FileText, Headphones, Image as ImageIcon, PlayCircle, X } from "lucide-react";
import { api } from "@/services/api";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import { PageLoading } from "@/components/ui/Skeleton";
import MediaPlaceholder from "@/components/ui/MediaPlaceholder";

export default function LibraryPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedKind, setSelectedKind] = useState<string>("");
  const [activeImage, setActiveImage] = useState<any | null>(null);

  const loadMedia = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const path = `/public/media${selectedKind ? "?kind=" + selectedKind : ""}`;
      const data = await api(path);
      setAssets(data || []);
    } catch (err: any) {
      setError(err?.message || "Không tải được thư viện.");
    } finally {
      setLoading(false);
    }
  }, [selectedKind]);

  useEffect(() => {
    loadMedia();
  }, [loadMedia]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveImage(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const getFileIcon = (kind: string) => {
    switch (kind) {
      case "image":
        return <ImageIcon size={20} className="text-blue-500" aria-hidden />;
      case "pdf":
        return <FileText size={20} className="text-red-500" aria-hidden />;
      case "audio":
        return <Headphones size={20} className="text-purple-500" aria-hidden />;
      default:
        return <PlayCircle size={20} className="text-primary" aria-hidden />;
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return "—";
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  const resolveUrl = (url: string) => {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    return url;
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 space-y-10 fade-in">
      <PageHeader
        title="Thư Viện Pháp Bảo"
        description="Nơi tải sách kinh điển PDF, lắng nghe các pháp thoại mp3 và xem hình ảnh sinh hoạt đạo tràng."
      />

      <section className="flex justify-center border-b border-border pb-2 overflow-x-auto">
        <div className="flex space-x-1 sm:space-x-2" role="tablist" aria-label="Loại tư liệu">
          {[
            { key: "", label: "Tất cả tư liệu" },
            { key: "image", label: "Hình ảnh" },
            { key: "pdf", label: "Tài liệu PDF" },
            { key: "audio", label: "Âm thanh Mp3" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={selectedKind === tab.key}
              onClick={() => setSelectedKind(tab.key)}
              className={`px-4 py-2.5 border-b-2 font-bold text-xs transition-all whitespace-nowrap min-h-11 ${
                selectedKind === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {loading ? (
        <PageLoading label="Đang tải thư viện..." />
      ) : error ? (
        <EmptyState title="Lỗi tải thư viện" description={error} onRetry={loadMedia} />
      ) : assets.length === 0 ? (
        <EmptyState title="Chưa có tư liệu" description="Chưa có tư liệu nào trong phân mục này." />
      ) : selectedKind === "image" || (selectedKind === "" && assets.every((a) => a.kind === "image")) ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
          {assets.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveImage(item)}
              className="bg-card border border-border rounded-xl overflow-hidden shadow-sm aspect-square relative group hover:border-primary/30 transition-all text-left"
            >
              {item.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={resolveUrl(item.url)}
                  alt={item.title || item.file_name || "Hình ảnh"}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <MediaPlaceholder variant="thumb" className="w-full h-full rounded-none border-0" />
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-background/90 border-t border-border p-2 text-center text-[10px] text-muted truncate">
                {item.title || item.file_name}
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl shadow-sm divide-y divide-border overflow-hidden">
          {assets.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-4 hover:bg-border/5 transition-colors gap-3"
            >
              <div className="flex items-center space-x-3.5 min-w-0">
                <span className="p-2.5 bg-background rounded-lg border border-border shrink-0">
                  {getFileIcon(item.kind)}
                </span>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-foreground truncate max-w-md">
                    {item.title || item.file_name}
                  </h4>
                  <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                    Dung lượng: {formatSize(item.size_bytes)}
                    {item.folder ? ` | Thư mục: ${item.folder}` : ""}
                  </p>
                </div>
              </div>

              {item.kind === "image" ? (
                <button
                  type="button"
                  onClick={() => setActiveImage(item)}
                  className="flex items-center space-x-1 border border-border bg-background hover:text-foreground text-muted px-3 py-2 rounded-full text-xs font-semibold hover:bg-muted-foreground/10 transition-colors min-h-10 shrink-0"
                >
                  Xem
                </button>
              ) : (
                <a
                  href={resolveUrl(item.url)}
                  download
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center space-x-1 border border-border bg-background hover:text-foreground text-muted px-3 py-2 rounded-full text-xs font-semibold hover:bg-muted-foreground/10 transition-colors min-h-10 shrink-0"
                >
                  <Download size={13} aria-hidden />
                  <span>Tải về</span>
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {activeImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 fade-in"
          role="dialog"
          aria-modal="true"
          aria-label="Xem hình ảnh"
          onClick={() => setActiveImage(null)}
        >
          <button
            type="button"
            onClick={() => setActiveImage(null)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 bg-white/10 p-2 rounded-full hover:bg-white/20 transition-all min-h-11 min-w-11 inline-flex items-center justify-center"
            title="Đóng (Esc)"
            aria-label="Đóng xem ảnh"
          >
            <X size={24} />
          </button>
          <div className="max-w-4xl max-h-[85vh] w-full text-center" onClick={(e) => e.stopPropagation()}>
            {activeImage.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={resolveUrl(activeImage.url)}
                alt={activeImage.title || activeImage.file_name || "Hình ảnh"}
                className="max-h-[75vh] w-auto max-w-full mx-auto rounded-lg object-contain shadow-2xl"
              />
            ) : (
              <div className="border border-white/20 p-12 rounded-lg bg-card/10">
                <span className="text-8xl text-primary/30 select-none block mb-4" aria-hidden>
                  ☸
                </span>
              </div>
            )}
            <p className="text-sm text-gray-300 mt-4">
              {activeImage.title || activeImage.file_name || activeImage.url}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
