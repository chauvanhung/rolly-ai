"use client";

import React, { useState, useEffect } from "react";
import { useFontSize } from "../context/AppContext";
import { Maximize2, Minimize2, Bookmark, Check } from "lucide-react";
import ShareButtons from "./ui/ShareButtons";
import RichTextContent from "./RichTextContent";

type ReadingChapter = {
  id: number;
  title: string;
  body: string | null;
  volume_title?: string | null;
  sort_order?: number;
};

interface ReadingViewProps {
  title: string;
  subtitle?: string;
  body?: string;
  chapters?: ReadingChapter[];
  itemType: "sutra" | "dharma_talk";
  itemId: number;
  sharePath?: string;
  isBookmarked?: boolean;
  onBookmarkToggle?: () => void;
  onProgressSave?: (percent: number) => void;
}

/** Nhóm chương theo Tập (volume_title). Giữ thứ tự sort. */
function groupChaptersByVolume(chapters: ReadingChapter[]) {
  const groups: { volume: string | null; items: { ch: ReadingChapter; globalIdx: number }[] }[] = [];
  const map = new Map<string, { volume: string | null; items: { ch: ReadingChapter; globalIdx: number }[] }>();

  chapters.forEach((ch, globalIdx) => {
    const vol = (ch.volume_title || "").trim() || null;
    const key = vol ?? "__none__";
    if (!map.has(key)) {
      const g = { volume: vol, items: [] as { ch: ReadingChapter; globalIdx: number }[] };
      map.set(key, g);
      groups.push(g);
    }
    map.get(key)!.items.push({ ch, globalIdx });
  });
  return groups;
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
    // Chữ đậm hơn nền để không chìm (tương phản WCAG tốt hơn)
    switch (readerTheme) {
      case "warm":
        return "bg-[#FAF5EC] text-[#1a1612] border-[#EADFC9]";
      case "cream":
        return "bg-[#FDFCF7] text-[#161410] border-[#EFECE0]";
      case "dark":
        return "bg-[#181613] text-[#F2EDE6] border-[#332E27]";
      case "gray":
        return "bg-[#F2F2F2] text-[#141414] border-[#E0E0E0]";
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

        {chapters && chapters.length > 1 && (() => {
          const groups = groupChaptersByVolume(chapters);
          const hasVolumes = groups.some((g) => g.volume);
          return (
            <nav className="mb-8 p-4 rounded-xl border border-border/40 bg-card/40" aria-label="Mục lục chương">
              <p className="text-xs font-bold uppercase tracking-wider text-muted mb-3">
                Mục lục{hasVolumes ? " (Tập → Chương)" : ""}
              </p>
              <div className="space-y-3">
                {groups.map((g) => (
                  <div key={g.volume ?? "__none__"}>
                    {g.volume && (
                      <p className="mb-1.5 font-serif text-sm font-bold text-foreground">
                        <a href={`#volume-${encodeURIComponent(g.volume)}`} className="hover:text-primary">
                          {g.volume}
                        </a>
                      </p>
                    )}
                    <ol className={`space-y-1 text-sm ${g.volume ? "ml-3 border-l border-border/50 pl-3" : ""}`}>
                      {g.items.map(({ ch, globalIdx }) => (
                        <li key={ch.id}>
                          <a href={`#chapter-${ch.id}`} className="text-primary hover:underline font-medium">
                            {globalIdx + 1}. {ch.title}
                          </a>
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            </nav>
          );
        })()}

        <div
          className="prose max-w-none prose-neutral max-w-none reader-body"
          style={{ fontSize: `${fontSize}px`, lineHeight: "1.85", color: "inherit" }}
        >
          {chapters && chapters.length > 0 ? (
            <div className="space-y-10">
              {groupChaptersByVolume(chapters).map((g) => (
                <div key={g.volume ?? "__none__"} className="space-y-10">
                  {g.volume && (
                    <header
                      id={`volume-${encodeURIComponent(g.volume)}`}
                      className="scroll-mt-24 border-b-2 border-primary/30 pb-3 pt-2"
                    >
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Tập / Quyển</p>
                      <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground">{g.volume}</h2>
                    </header>
                  )}
                  {g.items.map(({ ch, globalIdx }) => (
                    <section
                      key={ch.id}
                      id={`chapter-${ch.id}`}
                      className="border-t border-border/30 pt-8 first:border-0 first:pt-0 scroll-mt-24"
                    >
                      <h3 className="font-serif text-xl sm:text-2xl font-bold mb-4 text-[#8a5a12] dark:text-[#e0b44a]">
                        {globalIdx + 1}. {ch.title}
                      </h3>
                      <RichTextContent html={ch.body} className="leading-relaxed" />
                    </section>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <RichTextContent html={body} className="leading-relaxed" />
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
