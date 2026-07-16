"use client";

import React, { useState, useEffect } from "react";
import { useFontSize } from "../context/AppContext";
import { Maximize2, Minimize2, Bookmark, Check } from "lucide-react";
import ShareButtons from "./ui/ShareButtons";

interface ReadingViewProps {
  title: string;
  subtitle?: string;
  body?: string;
  chapters?: Array<{ id: number; title: string; body: string | null }>;
  itemType: "sutra" | "dharma_talk";
  itemId: number;
  sharePath?: string;
  isBookmarked?: boolean;
  onBookmarkToggle?: () => void;
  onProgressSave?: (percent: number) => void;
}

type ReaderTheme = "warm" | "cream" | "dark" | "gray";

export default function ReadingView({
  title,
  subtitle,
  body,
  chapters,
  itemType,
  itemId,
  sharePath,
  isBookmarked,
  onBookmarkToggle,
  onProgressSave,
}: ReadingViewProps) {
  const { fontSize, increaseFontSize, decreaseFontSize, resetFontSize } = useFontSize();
  const [readerTheme, setReaderTheme] = useState<ReaderTheme>("warm");
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [scrollPercent, setScrollPercent] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const doc = document.documentElement;
      const bodyEl = document.body;
      const scrollPos = window.scrollY || doc.scrollTop || bodyEl.scrollTop;
      const scrollHeight = (doc.scrollHeight || bodyEl.scrollHeight) - doc.clientHeight;

      const pct = scrollHeight > 0 ? Math.min(Math.round((scrollPos / scrollHeight) * 100), 100) : 0;
      setScrollPercent(pct);

      if (pct > 0 && pct % 10 === 0 && onProgressSave) {
        onProgressSave(pct);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [onProgressSave]);

  useEffect(() => {
    if (isFocusMode) {
      document.body.classList.add("focus-mode-active");
    } else {
      document.body.classList.remove("focus-mode-active");
    }
    return () => document.body.classList.remove("focus-mode-active");
  }, [isFocusMode]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFocusMode) setIsFocusMode(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isFocusMode]);

  const getThemeClass = () => {
    switch (readerTheme) {
      case "warm":
        return "bg-[#FAF5EC] text-[#2C241B] border-[#EADFC9]";
      case "cream":
        return "bg-[#FDFCF7] text-[#332F24] border-[#EFECE0]";
      case "dark":
        return "bg-[#181613] text-[#E5DFD5] border-[#332E27]";
      case "gray":
        return "bg-[#F2F2F2] text-[#222222] border-[#E0E0E0]";
    }
  };

  const themeLabels: Record<ReaderTheme, string> = {
    warm: "vàng ấm",
    cream: "trắng kem",
    dark: "tối gỗ",
    gray: "xám nhẹ",
  };

  return (
    <div className={`w-full rounded-xl border p-4 sm:p-8 md:p-12 transition-all duration-300 ${getThemeClass()}`}>
      <div className="fixed top-0 left-0 w-full h-1 bg-border/20 z-50" aria-hidden>
        <div className="h-full bg-primary transition-all duration-150" style={{ width: `${scrollPercent}%` }} />
      </div>

      <div className="flex flex-wrap items-center justify-between border-b border-border/60 pb-4 mb-8 gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {onBookmarkToggle && (
            <button
              type="button"
              onClick={onBookmarkToggle}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-full text-xs font-semibold border border-border bg-card transition-all min-h-10 ${
                isBookmarked ? "text-primary border-primary/30" : "text-muted"
              }`}
              title={isBookmarked ? "Bỏ lưu bài" : "Lưu bài kinh này"}
              aria-pressed={isBookmarked}
            >
              <Bookmark size={14} fill={isBookmarked ? "currentColor" : "none"} aria-hidden />
              <span>{isBookmarked ? "Đã lưu" : "Lưu lại"}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsFocusMode(!isFocusMode)}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-full text-xs font-semibold border border-border bg-card text-muted transition-colors hover:text-foreground min-h-10"
            title={isFocusMode ? "Thoát chế độ tập trung (Esc)" : "Bật chế độ đọc tập trung"}
            aria-pressed={isFocusMode}
          >
            {isFocusMode ? <Minimize2 size={14} aria-hidden /> : <Maximize2 size={14} aria-hidden />}
            <span>{isFocusMode ? "Bình thường" : "Đọc tập trung"}</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-1 text-xs">
            <button
              type="button"
              onClick={decreaseFontSize}
              className="w-10 h-10 rounded-full border border-border bg-card flex items-center justify-center font-bold text-muted hover:text-foreground"
              aria-label="Giảm cỡ chữ"
            >
              A-
            </button>
            <button
              type="button"
              onClick={resetFontSize}
              className="px-2 h-10 rounded-md border border-border bg-card flex items-center justify-center font-semibold text-muted hover:text-foreground"
            >
              Mặc định
            </button>
            <button
              type="button"
              onClick={increaseFontSize}
              className="w-10 h-10 rounded-full border border-border bg-card flex items-center justify-center font-bold text-muted hover:text-foreground"
              aria-label="Tăng cỡ chữ"
            >
              A+
            </button>
          </div>

          <div className="flex items-center space-x-1.5 border-l border-border pl-3" role="group" aria-label="Màu nền đọc">
            {(["warm", "cream", "dark", "gray"] as ReaderTheme[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setReaderTheme(t)}
                className={`w-7 h-7 rounded-full border flex items-center justify-center ${
                  t === "warm"
                    ? "bg-[#FAF5EC] border-[#EADFC9]"
                    : t === "cream"
                    ? "bg-[#FDFCF7] border-[#EFECE0]"
                    : t === "dark"
                    ? "bg-[#181613] border-[#332E27]"
                    : "bg-[#F2F2F2] border-[#E0E0E0]"
                }`}
                title={`Nền ${themeLabels[t]}`}
                aria-label={`Nền ${themeLabels[t]}`}
                aria-pressed={readerTheme === t}
              >
                {readerTheme === t && <Check size={10} className={t === "dark" ? "text-white" : "text-black"} aria-hidden />}
              </button>
            ))}
          </div>
        </div>
      </div>

      <article className="max-w-3xl mx-auto reading-content fade-in">
        <header className="text-center mb-10">
          <div className="text-primary text-3xl font-serif mb-2 select-none" aria-hidden>
            ☸
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight mb-3">{title}</h1>
          {subtitle && <p className="text-sm font-serif italic text-muted-foreground">{subtitle}</p>}
        </header>

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground/70 mb-6 font-mono border-b border-border/20 pb-3">
          <span>Tiến độ đọc: {scrollPercent}%</span>
          <span>{itemType === "sutra" ? "Kinh điển Phật giáo" : "Bài giảng & Pháp thoại"}</span>
        </div>

        {chapters && chapters.length > 1 && (
          <nav className="mb-8 p-4 rounded-xl border border-border/40 bg-card/40" aria-label="Mục lục chương">
            <p className="text-xs font-bold uppercase tracking-wider text-muted mb-2">Mục lục</p>
            <ol className="space-y-1.5 text-sm">
              {chapters.map((ch, idx) => (
                <li key={ch.id}>
                  <a href={`#chapter-${ch.id}`} className="text-primary hover:underline font-medium">
                    {idx + 1}. {ch.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        )}

        <div className="prose max-w-none prose-stone dark:prose-invert" style={{ fontSize: `${fontSize}px`, lineHeight: "1.8" }}>
          {chapters && chapters.length > 0 ? (
            <div className="space-y-12">
              {chapters.map((ch, idx) => (
                <section key={ch.id} id={`chapter-${ch.id}`} className="border-t border-border/30 pt-8 first:border-0 first:pt-0 scroll-mt-24">
                  <h2 className="font-serif text-xl sm:text-2xl font-bold mb-4 text-primary">
                    {idx + 1}. {ch.title}
                  </h2>
                  <div className="whitespace-pre-line leading-relaxed text-justify">{ch.body}</div>
                </section>
              ))}
            </div>
          ) : (
            <div className="whitespace-pre-line leading-relaxed text-justify">{body}</div>
          )}
        </div>

        <div className="mt-10 pt-6 border-t border-border/30">
          <ShareButtons title={title} path={sharePath} />
        </div>
      </article>

      <div className="max-w-3xl mx-auto border-t border-border/30 pt-6 mt-12 text-center text-xs text-muted-foreground/50">
        <p>Bản quyền lưu trữ thuộc hệ thống Thư viện Pháp bảo. Mọi sự sao chép tu học hoàn toàn hoan nghênh.</p>
        <p className="mt-1 opacity-70">#{itemId}</p>
      </div>
    </div>
  );
}
