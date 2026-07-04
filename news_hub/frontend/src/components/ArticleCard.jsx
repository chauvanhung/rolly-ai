import { timeAgo } from "../utils.js";

export default function ArticleCard({ article, rank, isHero = false, isBookmarked = false, onToggleBookmark, onClick }) {
  const wordCount = (article.title?.split(/\s+/).length || 0) + (article.summary?.split(/\s+/).length || 0);
  const readTimeMin = Math.max(1, Math.ceil(wordCount / 65));
  const readTimeStr = `${readTimeMin} phút đọc`;

  const sourceBadgeClass = getSourceBadgeStyle(article.source);

  // Card click handler
  const handleCardClick = () => {
    if (onClick) onClick(article);
  };

  // Bookmark button click handler
  const handleBookmarkClick = (e) => {
    e.stopPropagation();
    if (onToggleBookmark) onToggleBookmark(article);
  };

  if (isHero) {
    return (
      <div
        onClick={handleCardClick}
        className="group relative flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-brand-200 dark:border-stone-800 dark:bg-stone-900 dark:hover:border-brand-900/50 cursor-pointer lg:flex-row"
      >
        {/* Large Image on Left */}
        <div className="relative h-60 w-full overflow-hidden bg-gradient-to-br from-brand-50 to-brand-100 dark:from-stone-850 dark:to-stone-800 lg:h-auto lg:w-1/2 xl:w-7/12">
          {article.image ? (
            <img
              src={article.image}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-103"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-5xl">
              📰
            </div>
          )}
          {/* Rank Badge */}
          {typeof rank === "number" && (
            <div className="absolute top-4 left-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-brand-700 text-lg font-bold text-white shadow-lg">
              #{rank}
            </div>
          )}
          {/* Topic Badge */}
          {article.topic_label && (
            <div className="absolute bottom-4 left-4 z-10 rounded bg-stone-900/80 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-white backdrop-blur dark:bg-brand-800/90">
              {article.topic_label}
            </div>
          )}
        </div>

        {/* Text Content on Right */}
        <div className="flex flex-1 flex-col justify-between p-6 sm:p-8">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${sourceBadgeClass}`}>
                  {article.source}
                </span>
                <span className="text-xs text-stone-400 dark:text-stone-500">•</span>
                <span className="text-xs text-stone-450 dark:text-stone-400 font-medium">
                  {readTimeStr}
                </span>
              </div>
              
              {/* Bookmark Button */}
              <button
                onClick={handleBookmarkClick}
                className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                  isBookmarked
                    ? "bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-400"
                    : "text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:text-stone-550 dark:hover:bg-stone-800 dark:hover:text-stone-300"
                }`}
                title="Đọc sau"
              >
                <svg className="h-4.5 w-4.5" fill={isBookmarked ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </button>
            </div>

            <h3 className="font-serif text-2xl font-bold leading-tight text-stone-900 group-hover:text-brand-700 transition-colors dark:text-stone-50 dark:group-hover:text-brand-400 sm:text-3xl">
              {article.title}
            </h3>

            {article.summary && (
              <p className="mt-4 line-clamp-3 text-stone-500 dark:text-stone-400 font-sans text-sm leading-relaxed sm:text-base">
                {article.summary}
              </p>
            )}
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-stone-100 pt-4 dark:border-stone-800">
            <span className="text-xs text-stone-400 dark:text-stone-500">
              {timeAgo(article.published_at)}
            </span>
            <span className="text-xs font-semibold text-brand-700 dark:text-brand-400 flex items-center gap-1">
              Xem nhanh
              <svg className="h-3 w-3 transform transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Normal Grid / List Card
  return (
    <div
      onClick={handleCardClick}
      className="group flex flex-col sm:flex-row gap-4 overflow-hidden rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-brand-200 dark:border-stone-800 dark:bg-stone-900 dark:hover:border-brand-900/40 cursor-pointer md:flex-col"
    >
      {/* Card Image */}
      <div className="relative h-28 w-40 flex-shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-brand-50 to-brand-100 dark:from-stone-850 dark:to-stone-800 sm:h-32 sm:w-44 md:h-44 md:w-full">
        {article.image ? (
          <img
            src={article.image}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-104"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-3xl">
            📰
          </div>
        )}
        {/* Rank Badge */}
        {typeof rank === "number" && (
          <div className="absolute top-2 left-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-brand-700 text-xs font-bold text-white shadow">
            #{rank}
          </div>
        )}
      </div>

      {/* Card Details */}
      <div className="flex flex-1 flex-col justify-between min-w-0 md:w-full">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <div className="flex flex-wrap items-center gap-1.5 min-w-0">
              <span className={`truncate rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${sourceBadgeClass}`}>
                {article.source}
              </span>
              <span className="text-[10px] text-stone-400 dark:text-stone-500">•</span>
              <span className="text-[10px] text-stone-450 dark:text-stone-400 font-medium">
                {readTimeStr}
              </span>
            </div>
            
            <button
              onClick={handleBookmarkClick}
              className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
                isBookmarked
                  ? "bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-400"
                  : "text-stone-400 hover:bg-stone-150 hover:text-stone-600 dark:text-stone-550 dark:hover:bg-stone-800 dark:hover:text-stone-300"
              }`}
              title="Đọc sau"
            >
              <svg className="h-4 w-4" fill={isBookmarked ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </button>
          </div>

          <h3 className="line-clamp-2 font-serif text-base font-bold leading-snug text-stone-900 group-hover:text-brand-700 transition-colors dark:text-stone-100 dark:group-hover:text-brand-400 md:text-lg">
            {article.title}
          </h3>

          {article.summary && (
            <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-stone-500 dark:text-stone-400 md:text-sm">
              {article.summary}
            </p>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-stone-100 pt-2.5 dark:border-stone-800">
          <span className="text-[11px] text-stone-400 dark:text-stone-500">
            {timeAgo(article.published_at)}
          </span>
          {article.topic_label && (
            <span className="rounded bg-stone-100 dark:bg-stone-800 px-1.5 py-0.5 text-[10px] font-medium text-stone-500 dark:text-stone-400">
              {article.topic_label}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function getSourceBadgeStyle(source) {
  const s = source?.toLowerCase() || "";
  if (s.includes("vnexpress")) {
    return "border-purple-200 text-purple-700 bg-purple-50 dark:border-purple-900/30 dark:text-purple-400 dark:bg-purple-950/20";
  }
  if (s.includes("tuổi trẻ") || s.includes("tuoi tre")) {
    return "border-blue-200 text-blue-700 bg-blue-50 dark:border-blue-900/30 dark:text-blue-400 dark:bg-blue-950/20";
  }
  if (s.includes("thanh niên") || s.includes("thanh nien")) {
    return "border-emerald-200 text-emerald-700 bg-emerald-50 dark:border-emerald-900/30 dark:text-emerald-400 dark:bg-emerald-950/20";
  }
  if (s.includes("vietnamnet")) {
    return "border-red-200 text-red-700 bg-red-50 dark:border-red-900/30 dark:text-red-400 dark:bg-red-950/20";
  }
  return "border-stone-250 text-stone-600 bg-stone-50 dark:border-stone-800 dark:text-stone-400 dark:bg-stone-850/30";
}