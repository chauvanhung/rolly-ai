import { useEffect } from "react";
import { timeAgo } from "../utils.js";

export default function ArticleModal({ article, onClose, isBookmarked, onToggleBookmark }) {
  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  if (!article) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative z-10 w-full max-w-2xl transform overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl transition-all duration-300 dark:border-stone-800 dark:bg-stone-900 animate-in fade-in zoom-in-95">
        {/* Close Button on top right */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 bg-white/80 text-stone-600 shadow backdrop-blur transition hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-800/80 dark:text-stone-300 dark:hover:bg-stone-700"
          aria-label="Đóng"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Article Image / Header */}
        <div className="relative h-56 sm:h-72 w-full overflow-hidden bg-gradient-to-br from-brand-50 to-brand-100 dark:from-stone-850 dark:to-stone-800">
          {article.image ? (
            <img
              src={article.image}
              alt=""
              className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center text-stone-400 dark:text-stone-600">
              <span className="text-6xl mb-2">📰</span>
              <span className="text-sm font-medium tracking-wider uppercase">{article.source}</span>
            </div>
          )}
          {/* Subtle dark gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          
          <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
            <span className="rounded bg-brand-700 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-white shadow-sm">
              {article.topic_label || "Tin Nóng"}
            </span>
          </div>
        </div>

        {/* Article Body */}
        <div className="max-h-[50vh] overflow-y-auto px-6 py-6 sm:px-8">
          <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-stone-500 dark:text-stone-400">
            <span className="font-bold text-brand-800 dark:text-brand-400">{article.source}</span>
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-stone-300 dark:bg-stone-700" />
            <span>{timeAgo(article.published_at)}</span>
          </div>

          <h2 className="font-serif text-2xl font-bold leading-tight text-stone-900 dark:text-stone-50 sm:text-3xl">
            {article.title}
          </h2>

          {article.summary && (
            <div className="mt-5 space-y-4 font-sans text-base leading-relaxed text-stone-650 dark:text-stone-300">
              <p className="border-l-4 border-brand-700 pl-4 italic text-stone-600 dark:text-stone-400 font-medium">
                {article.summary}
              </p>
              <p className="text-sm text-stone-550 dark:text-stone-400">
                Bài viết gốc được đăng tải bởi kênh tin tức uy tín <strong>{article.source}</strong>. Bản xem trước chỉ hiển thị phần tóm tắt chính của sự kiện. Quý độc giả có thể click vào nút bên dưới để đọc toàn văn bài viết chi tiết tại trang tin chính thống.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col gap-3 border-t border-stone-150 bg-stone-50 px-6 py-4 dark:border-stone-850 dark:bg-stone-900/50 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          {/* Bookmark toggle */}
          <button
            onClick={() => onToggleBookmark(article)}
            className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 border ${
              isBookmarked
                ? "bg-brand-50 border-brand-200 text-brand-700 dark:bg-brand-950/30 dark:border-brand-900/50 dark:text-brand-400 hover:bg-brand-100"
                : "bg-white border-stone-200 text-stone-700 hover:bg-stone-50 dark:bg-stone-800 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-700"
            }`}
          >
            <svg
              className={`h-4.5 w-4.5 ${isBookmarked ? "fill-current" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
              />
            </svg>
            {isBookmarked ? "Đã lưu tin này" : "Đọc sau (Bookmark)"}
          </button>

          {/* Primary Action Button */}
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl bg-brand-800 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-900/10 transition-all duration-200 hover:bg-brand-700 hover:shadow-brand-900/20 dark:bg-brand-700 dark:hover:bg-brand-600"
          >
            <span>Đọc tin gốc</span>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
