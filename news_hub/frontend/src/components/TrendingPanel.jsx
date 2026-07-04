import { useEffect, useState, useCallback } from "react";
import { fetchTrending } from "../api.js";

function timeAgo(pubDate) {
  if (!pubDate) return "";
  const then = new Date(pubDate).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Math.max(0, Date.now() - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  return new Date(then).toLocaleDateString("vi-VN");
}

const EMPTY = { search_trends: [], topic_trends: [], hot_keywords: [], top_searches: [] };

export default function TrendingPanel({ onPickKeyword }) {
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [openTrend, setOpenTrend] = useState(null);

  const load = useCallback((manual = false) => {
    if (manual) setRefreshing(true);
    return fetchTrending()
      .then((d) => {
        setData({
          search_trends: d.search_trends || [],
          topic_trends: d.topic_trends || [],
          hot_keywords: d.hot_keywords || [],
          top_searches: d.top_searches || [],
        });
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }, []);

  useEffect(() => {
    let alive = true;
    const run = () => alive && load();
    run();
    const id = setInterval(run, 120000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [load]);

  const hasSearches = data.top_searches.length > 0;
  const hasTrends = data.search_trends.length > 0;
  const topicList = data.topic_trends.filter((t) => t.items && t.items.length > 0);

  return (
    <section className="mb-8 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-850 dark:bg-stone-900">
      <div className="flex items-center gap-2">
        <span className="text-lg">🔥</span>
        <h2 className="font-serif text-base font-extrabold tracking-tight text-stone-850 dark:text-stone-150">
          Đang trending
        </h2>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="ml-auto inline-flex items-center gap-1 rounded-full border border-stone-200 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-stone-500 transition hover:border-brand-300 hover:text-brand-700 disabled:opacity-50 dark:border-stone-800 dark:text-stone-400 dark:hover:border-brand-800 dark:hover:text-brand-300"
          title="Làm mới"
        >
          <span className={"text-xs " + (refreshing ? "animate-spin" : "")}>↻</span>
          {refreshing ? "Đang tải" : "Làm mới"}
        </button>
      </div>

      {loading ? (
        <div className="mt-4 space-y-6">
          <div>
            <div className="mb-2 h-3 w-40 animate-pulse rounded bg-stone-150 dark:bg-stone-850" />
            <div className="space-y-1.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-8 animate-pulse rounded-lg bg-stone-150 dark:bg-stone-850" />
              ))}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl bg-stone-150 dark:bg-stone-850" />
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-6">
          {/* Xu huong tim kiem thuc te (Google Trends VN) */}
          <div>
            <div className="mb-2 flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                Xu hướng tìm kiếm hôm nay
              </h3>
              <span className="rounded-full bg-brand-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-brand-600 dark:bg-brand-950/40 dark:text-brand-300">
                Google Trends
              </span>
            </div>
            {!hasTrends ? (
              <p className="text-sm text-stone-400 dark:text-stone-500">Chưa có dữ liệu.</p>
            ) : (
              <ol className="space-y-1.5">
                {data.search_trends.map((t, i) => {
                  const open = openTrend === t.term;
                  return (
                    <li
                      key={t.term}
                      className="rounded-lg border border-stone-150 bg-stone-50/60 dark:border-stone-850 dark:bg-stone-850/40"
                    >
                      <div className="flex items-center gap-3 px-2.5 py-1.5">
                        <span
                          className={
                            "w-5 text-center text-sm font-extrabold " +
                            (i < 3 ? "text-brand-600 dark:text-brand-400" : "text-stone-400 dark:text-stone-600")
                          }
                        >
                          {i + 1}
                        </span>
                        <button
                          onClick={() => onPickKeyword(t.term)}
                          className="flex-1 truncate text-left text-sm font-medium text-stone-800 hover:text-brand-700 dark:text-stone-200 dark:hover:text-brand-300"
                          title={`Tìm "${t.term}"`}
                        >
                          {t.term}
                        </button>
                        {t.traffic && (
                          <span className="whitespace-nowrap rounded bg-brand-100/70 px-1.5 py-0.5 text-[10px] font-bold text-brand-700 dark:bg-brand-950/50 dark:text-brand-300">
                            {t.traffic} lượt
                          </span>
                        )}
                        {t.related && t.related.length > 0 && (
                          <button
                            onClick={() => setOpenTrend(open ? null : t.term)}
                            className="text-stone-400 transition hover:text-stone-700 dark:hover:text-stone-200"
                            title="Tin liên quan"
                          >
                            <span className={"inline-block text-xs transition-transform " + (open ? "rotate-180" : "")}>
                              ▾
                            </span>
                          </button>
                        )}
                      </div>
                      {open && t.related && t.related.length > 0 && (
                        <ul className="space-y-1 border-t border-stone-150 px-3 py-2 dark:border-stone-850">
                          {t.related.map((r) => (
                            <li key={r.url}>
                              <a
                                href={r.url}
                                target="_blank"
                                rel="noreferrer"
                                className="block truncate text-xs text-stone-600 hover:text-brand-700 dark:text-stone-400 dark:hover:text-brand-300"
                              >
                                • {r.title}
                                {r.source && (
                                  <span className="ml-1 text-[10px] text-stone-400 dark:text-stone-600">
                                    — {r.source}
                                  </span>
                                )}
                              </a>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </div>

          {/* Xu huong theo mang */}
          {topicList.length > 0 && (
            <div>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                Xu hướng theo mảng
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {topicList.map((t) => (
                  <div
                    key={t.key}
                    className="rounded-xl border border-stone-150 bg-stone-50/60 p-3 dark:border-stone-850 dark:bg-stone-850/40"
                  >
                    <div className="mb-2 flex items-center gap-1.5">
                      <span className="text-base">{t.icon}</span>
                      <span className="text-sm font-bold text-stone-800 dark:text-stone-150">
                        {t.label}
                      </span>
                    </div>
                    <ul className="space-y-2">
                      {t.items.slice(0, 5).map((it) => (
                        <li key={it.url} className="flex gap-2">
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-400" />
                          <div className="min-w-0">
                            <a
                              href={it.url}
                              target="_blank"
                              rel="noreferrer"
                              className="line-clamp-2 text-xs leading-snug text-stone-700 hover:text-brand-700 dark:text-stone-300 dark:hover:text-brand-300"
                              title={it.source}
                            >
                              {it.title}
                            </a>
                            <div className="mt-0.5 flex items-center gap-1 text-[10px] text-stone-400 dark:text-stone-600">
                              {it.source && <span className="truncate">{it.source}</span>}
                              {it.published && timeAgo(it.published) && (
                                <>
                                  <span>·</span>
                                  <span className="whitespace-nowrap">{timeAgo(it.published)}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            {/* Tu khoa noi bat */}
            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                Từ khóa nổi bật
              </h3>
              <div className="flex flex-wrap gap-2">
                {data.hot_keywords.length === 0 && (
                  <span className="text-sm text-stone-400">Chưa có dữ liệu.</span>
                )}
                {data.hot_keywords.map((kw, i) => (
                  <button
                    key={kw.keyword}
                    onClick={() => onPickKeyword(kw.keyword)}
                    className="group inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-sm font-medium text-stone-700 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 dark:border-stone-800 dark:bg-stone-850 dark:text-stone-300 dark:hover:border-brand-800 dark:hover:bg-brand-950/40 dark:hover:text-brand-300"
                    title={`Xuất hiện trong ${kw.mentions} bài`}
                  >
                    {i < 3 && <span className="text-brand-500">▲</span>}
                    {kw.keyword}
                    <span className="rounded bg-stone-200/70 px-1 text-[10px] font-bold text-stone-500 dark:bg-stone-800 dark:text-stone-400">
                      {kw.mentions}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Duoc tim nhieu nhat */}
            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                Được tìm nhiều nhất
              </h3>
              {!hasSearches ? (
                <p className="text-sm text-stone-400 dark:text-stone-500">
                  Chưa có lượt tìm kiếm nào. Hãy thử tìm một tin!
                </p>
              ) : (
                <ol className="space-y-1.5">
                  {data.top_searches.map((s, i) => (
                    <li key={s.term}>
                      <button
                        onClick={() => onPickKeyword(s.term)}
                        className="flex w-full items-center gap-3 rounded-lg px-2 py-1 text-left transition hover:bg-stone-100 dark:hover:bg-stone-850"
                      >
                        <span
                          className={
                            "w-5 text-center text-sm font-extrabold " +
                            (i < 3 ? "text-brand-600 dark:text-brand-400" : "text-stone-400 dark:text-stone-600")
                          }
                        >
                          {i + 1}
                        </span>
                        <span className="flex-1 truncate text-sm text-stone-700 dark:text-stone-300">
                          {s.term}
                        </span>
                        <span className="text-[10px] font-semibold text-stone-400 dark:text-stone-550">
                          {s.count} lượt
                        </span>
                      </button>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
