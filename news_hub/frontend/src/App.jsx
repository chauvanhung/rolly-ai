import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchHot, fetchTopics, searchNews } from "./api.js";
import ArticleCard from "./components/ArticleCard.jsx";
import ArticleModal from "./components/ArticleModal.jsx";
import TrendingPanel from "./components/TrendingPanel.jsx";

export default function App() {
  const [topics, setTopics] = useState([]);
  const [activeTopic, setActiveTopic] = useState(null); // null = tin nong tong hop
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [searchMode, setSearchMode] = useState(false);
  const searchTimer = useRef(null);

  // New States for Premium features
  const [bookmarkMode, setBookmarkMode] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [bookmarks, setBookmarks] = useState(() => {
    try {
      const saved = localStorage.getItem("bookmarks");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem("theme");
      if (saved) return saved;
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    } catch {
      return "light";
    }
  });

  // Sync theme to root class
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Sync bookmarks to localStorage
  useEffect(() => {
    localStorage.setItem("bookmarks", JSON.stringify(bookmarks));
  }, [bookmarks]);

  const toggleTheme = () => {
    setTheme((t) => (t === "light" ? "dark" : "light"));
  };

  const toggleBookmark = useCallback((article) => {
    setBookmarks((prev) => {
      const exists = prev.some((b) => b.url === article.url);
      if (exists) {
        return prev.filter((b) => b.url !== article.url);
      } else {
        return [...prev, article];
      }
    });
  }, []);

  const handlePickKeyword = useCallback((term) => {
    setBookmarkMode(false);
    setActiveTopic(null);
    setQuery(term);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  // Fetch categories on mount
  useEffect(() => {
    fetchTopics()
      .then((data) => setTopics(data.topics || []))
      .catch(() => setTopics([]));
  }, []);

  const loadHot = useCallback(async (topic) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchHot(topic, 45);
      setArticles(data.articles || []);
    } catch (e) {
      setError("Không tải được dữ liệu tin tức. Vui lòng kiểm tra kết nối mạng và thử lại.");
      setArticles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Control loading logic based on views
  useEffect(() => {
    if (!searchMode && !bookmarkMode) {
      loadHot(activeTopic);
    } else if (bookmarkMode) {
      setLoading(false);
      setError(null);
    }
  }, [activeTopic, searchMode, bookmarkMode, loadHot]);

  // Debounced search
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    const q = query.trim();
    if (q.length < 2) {
      setSearchMode(false);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      setSearchMode(true);
      setBookmarkMode(false);
      setLoading(true);
      setError(null);
      try {
        const data = await searchNews(q, 45);
        setArticles(data.articles || []);
      } catch (e) {
        setError("Tìm kiếm xảy ra lỗi. Vui lòng thử lại sau.");
        setArticles([]);
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => clearTimeout(searchTimer.current);
  }, [query]);

  // Filter articles based on active mode
  const displayedArticles = useMemo(() => {
    if (bookmarkMode) return bookmarks;
    return articles;
  }, [bookmarkMode, bookmarks, articles]);

  const heading = useMemo(() => {
    if (searchMode) return `Kết quả cho "${query.trim()}"`;
    if (bookmarkMode) return `Tin tức đã đánh dấu (${bookmarks.length})`;
    if (!activeTopic) return "Tin nóng tổng hợp";
    const t = topics.find((x) => x.key === activeTopic);
    return t ? t.label : "Tin tức nóng";
  }, [searchMode, bookmarkMode, query, activeTopic, topics, bookmarks.length]);

  return (
    <div className="min-h-screen bg-[#faf9f6] text-stone-900 transition-colors duration-300 dark:bg-stone-950 dark:text-stone-100">
      {/* Sticky Premium Header */}
      <header className="sticky top-0 z-40 border-b border-stone-150 glass-header dark:border-stone-850">
        <div className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <h1
              className="flex items-center gap-2 cursor-pointer select-none"
              onClick={() => {
                setQuery("");
                setSearchMode(false);
                setBookmarkMode(false);
                setActiveTopic(null);
              }}
            >
              <span className="bg-gradient-to-r from-brand-800 to-brand-600 bg-clip-text text-2xl font-extrabold tracking-tight text-transparent dark:from-brand-500 dark:to-brand-400">
                📰 TIN NÓNG
              </span>
              <span className="hidden rounded-md bg-stone-100 px-1.5 py-0.5 text-[10px] font-bold text-stone-500 dark:bg-stone-850 dark:text-stone-400 sm:inline uppercase tracking-widest">
                Hub
              </span>
            </h1>
            
            <div className="flex items-center gap-3">
              {/* Modern Search bar */}
              <div className="relative flex items-center">
                <svg className="absolute left-3.5 h-4 w-4 text-stone-400 dark:text-stone-550 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Tìm tin nóng..."
                  className="w-40 rounded-full border border-stone-200 bg-stone-50 pl-9 pr-4 py-1.5 text-sm outline-none transition-all duration-300 focus:w-48 focus:border-brand-300 focus:bg-white focus:ring-4 focus:ring-brand-100/50 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-150 dark:focus:border-brand-850 dark:focus:bg-stone-950 dark:focus:ring-brand-950/40 sm:w-56 sm:focus:w-64"
                />
              </div>

              {/* Theme Toggle Button */}
              <button
                onClick={toggleTheme}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-600 shadow-sm transition hover:bg-stone-550/10 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800"
                title={theme === "light" ? "Chế độ tối" : "Chế độ sáng"}
              >
                {theme === "light" ? (
                  <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                ) : (
                  <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707m2.828 9.9a5 5 0 117.072 0l-7.072 0z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Categories navigation pills */}
          <nav className="flex gap-2 overflow-x-auto pb-1 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
            <TopicButton
              label="🔥 Tiêu Điểm"
              active={!activeTopic && !searchMode && !bookmarkMode}
              onClick={() => {
                setQuery("");
                setSearchMode(false);
                setBookmarkMode(false);
                setActiveTopic(null);
              }}
            />
            {topics.map((t) => (
              <TopicButton
                key={t.key}
                label={t.label}
                active={activeTopic === t.key && !searchMode && !bookmarkMode}
                onClick={() => {
                  setQuery("");
                  setSearchMode(false);
                  setBookmarkMode(false);
                  setActiveTopic(t.key);
                }}
              />
            ))}
            <TopicButton
              label="🔖 Đọc Sau"
              active={bookmarkMode && !searchMode}
              onClick={() => {
                setQuery("");
                setSearchMode(false);
                setBookmarkMode(true);
                setActiveTopic(null);
              }}
            />
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <h2 className="mb-6 font-serif text-xl font-extrabold tracking-tight text-stone-850 dark:text-stone-150 sm:text-2xl">
          {heading}
        </h2>

        {!searchMode && !bookmarkMode && !activeTopic && (
          <TrendingPanel onPickKeyword={handlePickKeyword} />
        )}

        {loading && <SkeletonList isSearchOrBookmark={searchMode || bookmarkMode} />}
        
        {error && !loading && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm font-medium text-red-650 dark:border-red-950/30 dark:bg-red-950/10 dark:text-red-400">
            {error}
          </div>
        )}
        
        {!loading && !error && displayedArticles.length === 0 && (
          <div className="rounded-2xl border border-dashed border-stone-200 bg-white p-12 text-center dark:border-stone-800 dark:bg-stone-900/40">
            <div className="text-4xl mb-3">🔖</div>
            <h3 className="font-semibold text-stone-800 dark:text-stone-200">
              {bookmarkMode ? "Không có tin tức đã lưu" : "Không có tin nào"}
            </h3>
            <p className="mt-2 text-sm text-stone-500 dark:text-stone-400 max-w-sm mx-auto">
              {bookmarkMode
                ? "Đánh dấu bài viết bất kỳ bằng nút bookmark để xem lại tại mục này."
                : "Không tìm thấy kết quả phù hợp. Vui lòng thử từ khóa khác."}
            </p>
          </div>
        )}

        {/* Layout list/grid selection */}
        {!loading && !error && displayedArticles.length > 0 && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Render Large Hero Card for the first article (only in Normal Category list) */}
            {!searchMode && !bookmarkMode && (
              <ArticleCard
                article={displayedArticles[0]}
                rank={!activeTopic ? 1 : undefined}
                isHero={true}
                isBookmarked={bookmarks.some((b) => b.url === displayedArticles[0].url)}
                onToggleBookmark={toggleBookmark}
                onClick={setSelectedArticle}
              />
            )}

            {/* Grid layout for remaining articles */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {displayedArticles.slice(!searchMode && !bookmarkMode ? 1 : 0).map((a, i) => (
                <ArticleCard
                  key={a.url}
                  article={a}
                  rank={!searchMode && !bookmarkMode && !activeTopic ? i + 2 : undefined}
                  isHero={false}
                  isBookmarked={bookmarks.some((b) => b.url === a.url)}
                  onToggleBookmark={toggleBookmark}
                  onClick={setSelectedArticle}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Premium styled footer */}
      <footer className="mx-auto max-w-4xl border-t border-stone-150 px-4 py-8 text-center text-xs text-stone-450 dark:border-stone-850 dark:text-stone-500 sm:px-6">
        <p className="font-semibold text-stone-500 dark:text-stone-450 mb-1">News Hub v2.0</p>
        <p>Tổng hợp tự động từ RSS công khai của các tòa soạn báo chính thống tại Việt Nam</p>
        <p className="mt-1 opacity-75">Hệ thống đồng bộ cập nhật liên tục mỗi 5 phút · Thiết kế cao cấp</p>
      </footer>

      {/* Article Detail Reader Modal */}
      {selectedArticle && (
        <ArticleModal
          article={selectedArticle}
          onClose={() => setSelectedArticle(null)}
          isBookmarked={bookmarks.some((b) => b.url === selectedArticle.url)}
          onToggleBookmark={toggleBookmark}
        />
      )}
    </div>
  );
}

function TopicButton({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={
        "whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all duration-200 cursor-pointer " +
        (active
          ? "bg-brand-800 text-white shadow-md shadow-brand-900/10 dark:bg-brand-700"
          : "bg-stone-150/60 text-stone-600 hover:bg-stone-200 hover:text-stone-800 dark:bg-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-300")
      }
    >
      {label}
    </button>
  );
}

function SkeletonList({ isSearchOrBookmark }) {
  return (
    <div className="space-y-6">
      {/* Hero skeleton */}
      {!isSearchOrBookmark && (
        <div className="flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm dark:border-stone-850 dark:bg-stone-900 lg:flex-row h-auto min-h-[300px]">
          <div className="h-60 w-full animate-pulse bg-stone-200 dark:bg-stone-800 lg:h-auto lg:w-1/2" />
          <div className="flex-1 space-y-4 p-6 sm:p-8">
            <div className="h-4 w-1/4 animate-pulse rounded bg-stone-200 dark:bg-stone-800" />
            <div className="h-8 w-3/4 animate-pulse rounded bg-stone-200 dark:bg-stone-800" />
            <div className="h-4 w-full animate-pulse rounded bg-stone-150 dark:bg-stone-850" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-stone-150 dark:bg-stone-850" />
          </div>
        </div>
      )}
      
      {/* Grid skeletons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-850 dark:bg-stone-900 gap-4">
            <div className="h-44 w-full animate-pulse rounded-xl bg-stone-200 dark:bg-stone-800" />
            <div className="space-y-2.5">
              <div className="h-3 w-1/3 animate-pulse rounded bg-stone-200 dark:bg-stone-800" />
              <div className="h-5 w-3/4 animate-pulse rounded bg-stone-200 dark:bg-stone-800" />
              <div className="h-3 w-full animate-pulse rounded bg-stone-150 dark:bg-stone-850" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}