"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  BookOpen,
  PlayCircle,
  Calendar,
  HeartHandshake,
  Mail,
  ChevronRight,
  Pin,
  Award,
  Quote,
} from "lucide-react";
import { api } from "@/services/api";
import { getLunarDateString } from "@/utils/lunar";
import MediaPlaceholder from "@/components/ui/MediaPlaceholder";
import { CardSkeleton, ListSkeleton } from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";

export default function HomePage() {
  const [sutras, setSutras] = useState<any[]>([]);
  const [talks, setTalks] = useState<any[]>([]);
  const [lectures, setLectures] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [retreats, setRetreats] = useState<any[]>([]);
  const [charities, setCharities] = useState<any[]>([]);
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [subName, setSubName] = useState("");
  const [subEmail, setSubEmail] = useState("");
  const [subConsent, setSubConsent] = useState(false);
  const [subMessage, setSubMessage] = useState("");
  const [subSuccess, setSubSuccess] = useState(false);
  const [subLoading, setSubLoading] = useState(false);

  const loadHomeContent = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [sutraRes, talkRes, lectureRes, eventRes, retreatRes, charityRes, newsRes] =
        await Promise.all([
          api("/public/sutras?page_size=24"),
          api("/public/articles?page_size=5"),
          api("/public/lectures?page_size=4"),
          api("/public/calendar"),
          api("/public/retreats"),
          api("/public/charities"),
          api("/public/news?page_size=4"),
        ]);

      setSutras(sutraRes.items || []);
      setTalks(talkRes.items || []);
      setLectures(lectureRes.items || []);
      setEvents((eventRes || []).slice(0, 3));
      setRetreats((retreatRes || []).slice(0, 2));
      setCharities((charityRes || []).slice(0, 2));
      setNews(newsRes.items || []);
    } catch (err: any) {
      console.error("Error loading homepage data:", err);
      setError(err?.message || "Không tải được nội dung trang chủ.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHomeContent();
  }, [loadHomeContent]);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubMessage("");
    if (!subConsent) {
      setSubMessage("Bạn cần đồng ý với chính sách nhận thông báo.");
      return;
    }
    setSubLoading(true);
    try {
      const res = await api("/public/subscribe", {
        method: "POST",
        body: JSON.stringify({
          email: subEmail,
          full_name: subName,
          phone: null,
          interests: "news,retreats",
        }),
      });
      setSubSuccess(true);
      setSubMessage(res.message || "Đăng ký thành công.");
      setSubName("");
      setSubEmail("");
      setSubConsent(false);
    } catch (err: any) {
      setSubSuccess(false);
      setSubMessage(err.message || "Lỗi đăng ký nhận tin.");
    } finally {
      setSubLoading(false);
    }
  };

  const quotes = [
    {
      text: "Chiến thắng bản thân còn vẻ vang hơn chiến thắng hàng vạn quân thù trên chiến trường. Người tự thắng mình là người chiến thắng oanh liệt nhất.",
      ref: "Kinh Pháp Cú - Câu 103",
    },
    {
      text: "Không làm mọi điều ác, Thành tựu các hạnh lành, Giữ tâm ý trong sạch, Chính lời chư Phật dạy.",
      ref: "Kinh Pháp Cú - Câu 183",
    },
    {
      text: "Hận thù diệt hận thù, Đời này không có được. Từ bi diệt hận thù, Là định luật ngàn thu.",
      ref: "Kinh Pháp Cú - Câu 5",
    },
    {
      text: "Như hoa tươi đẹp đẽ, Chỉ có sắc không hương. Lời khéo nói vô ích, Cho người không thực hành.",
      ref: "Kinh Pháp Cú - Câu 51",
    },
  ];

  const dailyQuote = quotes[new Date().getDate() % quotes.length];
  const featuredTalk = talks[0];
  const sideNews = news.slice(0, 3);

  const sutrasByGroup = sutras.reduce<Record<string, any[]>>((acc, item) => {
    const group = item.sutra_group || "Kinh khác";
    if (!acc[group]) acc[group] = [];
    acc[group].push(item);
    return acc;
  }, {});

  const groupOrder = [
    "Kinh tạng Nikāya",
    "Kinh Đại thừa",
    "Kinh Tịnh Độ",
    "Thiền tông",
    "Kinh tụng phổ thông",
    "Nguyên Thủy",
    "Đại Thừa",
    "Kinh mẫu",
    "Kinh khác",
  ];

  const sortedSutraGroups = Object.entries(sutrasByGroup)
    .sort(([a], [b]) => {
      const ai = groupOrder.indexOf(a);
      const bi = groupOrder.indexOf(b);
      if (ai !== -1 || bi !== -1) return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      return a.localeCompare(b, "vi");
    })
    .slice(0, 4);

  return (
    <div className="space-y-6 pb-16">
      <section className="bg-primary/5 border-b border-border/80 py-2.5 transition-colors">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center text-xs font-semibold text-primary gap-2">
          <div className="flex items-center space-x-1.5 font-serif">
            <span aria-hidden>☸</span>
            <span>{getLunarDateString()}</span>
          </div>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-muted-foreground">
            <span>Múi giờ Việt Nam GMT+7</span>
            <Link href="/retreats" className="hover:text-primary transition-colors">
              Khóa tu đang mở hồ sơ →
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
        {error && (
          <EmptyState
            title="Không tải được nội dung"
            description={error}
            onRetry={loadHomeContent}
          />
        )}

        {/* Hero grid */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 flex flex-col justify-between bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:border-primary/20 transition-all">
            {loading ? (
              <div className="p-4">
                <CardSkeleton />
              </div>
            ) : featuredTalk ? (
              <div className="flex flex-col justify-between h-full">
                <MediaPlaceholder
                  variant="cover"
                  src={featuredTalk.cover_url}
                  alt={featuredTalk.title}
                  badge={
                    <span className="absolute top-4 left-4 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                      Tiêu điểm Phật học
                    </span>
                  }
                />
                <div className="p-6 space-y-3.5">
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                    <span className="font-semibold text-primary">
                      {featuredTalk.category_name || "Phật Pháp"}
                    </span>
                    <span aria-hidden>•</span>
                    <span>{new Date(featuredTalk.created_at).toLocaleDateString("vi-VN")}</span>
                  </div>
                  <Link href={`/articles/${featuredTalk.slug}`} className="block group">
                    <h2 className="font-serif text-2xl font-bold text-foreground group-hover:text-primary transition-colors leading-tight">
                      {featuredTalk.title}
                    </h2>
                  </Link>
                  <p className="text-sm text-muted leading-relaxed line-clamp-3">
                    {featuredTalk.excerpt ||
                      "Đọc giáo lý ứng dụng cuộc sống căn bản, rèn luyện chánh niệm tĩnh lặng..."}
                  </p>
                  <div className="pt-2 flex items-center justify-between text-xs border-t border-border/40">
                    <span className="text-muted font-medium">
                      Giảng sư: {featuredTalk.author_name || "Chùa Huê Nghiêm"}
                    </span>
                    <Link
                      href={`/articles/${featuredTalk.slug}`}
                      className="inline-flex items-center text-primary font-bold hover:underline"
                    >
                      Đọc toàn bài →
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              !error && (
                <div className="p-10 text-center text-muted">Chưa có bài viết pháp thoại tiêu điểm.</div>
              )
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between border-b-2 border-primary pb-1.5">
              <h3 className="text-xs font-bold text-primary uppercase font-serif tracking-wider flex items-center">
                <Pin size={14} className="mr-1.5 text-primary rotate-45" aria-hidden />
                <span>Bản tin mới</span>
              </h3>
              <Link href="/news" className="text-[10px] font-bold text-muted hover:text-primary">
                Xem tất cả
              </Link>
            </div>

            {loading ? (
              <ListSkeleton count={3} />
            ) : sideNews.length === 0 ? (
              <p className="text-xs text-muted italic">Chưa ghi nhận bản tin mới.</p>
            ) : (
              <div className="space-y-4">
                {sideNews.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-4 p-3 bg-card border border-border rounded-xl hover:border-primary/15 transition-all shadow-sm"
                  >
                    <MediaPlaceholder variant="thumb" src={item.cover_url} alt="" className="rounded-lg" />
                    <div className="min-w-0 space-y-1.5">
                      <span className="text-[10px] text-muted-foreground font-mono block">
                        {new Date(item.created_at).toLocaleDateString("vi-VN")}
                        {item.is_pinned ? " · Ghim" : ""}
                      </span>
                      <Link href={`/news/${item.slug}`} className="block group">
                        <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                          {item.title}
                        </h4>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Main + sidebar */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-10">
            {/* Articles */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <h3 className="font-serif text-lg font-bold text-foreground border-l-4 border-l-primary pl-3">
                  Phật Pháp Ứng Dụng
                </h3>
                <Link href="/articles" className="text-xs font-bold text-primary hover:underline">
                  Xem thêm
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {loading ? (
                  <>
                    <CardSkeleton lines={2} />
                    <CardSkeleton lines={2} />
                  </>
                ) : (
                  talks.slice(1, 3).map((item) => (
                    <div
                      key={item.id}
                      className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-3 hover:border-primary/20 transition-all"
                    >
                      <span className="text-[10px] text-primary font-bold uppercase tracking-wider">
                        {item.category_name || "Giáo lý"}
                      </span>
                      <h4 className="font-serif text-sm font-bold text-foreground line-clamp-2">
                        {item.title}
                      </h4>
                      <p className="text-xs text-muted line-clamp-2">{item.excerpt}</p>
                      <Link
                        href={`/articles/${item.slug}`}
                        className="text-xs font-semibold text-primary hover:underline inline-block mt-2"
                      >
                        Đọc tiếp →
                      </Link>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Lectures */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <h3 className="font-serif text-lg font-bold text-foreground border-l-4 border-l-primary pl-3">
                  Nghe Pháp Thoại
                </h3>
                <Link href="/lectures" className="text-xs font-bold text-primary hover:underline">
                  Xem thêm
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {loading ? (
                  <>
                    <CardSkeleton lines={2} />
                    <CardSkeleton lines={2} />
                  </>
                ) : (
                  lectures.slice(0, 2).map((item) => (
                    <div
                      key={item.id}
                      className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-3 hover:border-primary/20 transition-all"
                    >
                      <div className="flex items-center space-x-1.5 text-xs text-primary font-bold">
                        <PlayCircle size={14} aria-hidden />
                        <span>{item.video_url ? "Video Giảng" : "Audio Pháp thoại"}</span>
                      </div>
                      <h4 className="font-serif text-sm font-bold text-foreground line-clamp-2">
                        {item.title}
                      </h4>
                      <p className="text-xs text-muted line-clamp-2">{item.description}</p>
                      <Link
                        href={`/lectures/${item.slug}`}
                        className="text-xs font-semibold text-primary hover:underline inline-block mt-2"
                      >
                        Nghe giảng →
                      </Link>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Sutras by group */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <h3 className="font-serif text-lg font-bold text-foreground border-l-4 border-l-primary pl-3">
                  Kinh Điển Pháp Bảo
                </h3>
                <Link href="/sutras" className="text-xs font-bold text-primary hover:underline">
                  Xem toàn bộ thư viện
                </Link>
              </div>

              {loading ? (
                <CardSkeleton lines={4} />
              ) : sortedSutraGroups.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-card p-5 text-sm text-muted">
                  Chưa có bài kinh công khai.
                </div>
              ) : (
                <div className="space-y-5">
                  {sortedSutraGroups.map(([group, items]) => (
                    <div key={group} className="bg-card border border-border rounded-2xl p-4 shadow-sm">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <h4 className="font-serif text-base font-bold text-foreground">{group}</h4>
                          <p className="text-[11px] text-muted-foreground">
                            {items.length} bài kinh đã xuất bản
                          </p>
                        </div>
                        <BookOpen size={18} className="text-primary" aria-hidden />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {items.slice(0, 4).map((item) => (
                          <Link
                            key={item.id}
                            href={`/sutras/${item.slug}`}
                            className="group rounded-xl border border-border/70 bg-background/50 p-3 transition-all hover:border-primary/30 hover:bg-primary/5"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <h5 className="font-serif text-sm font-bold text-foreground group-hover:text-primary line-clamp-2">
                                  {item.title}
                                </h5>
                                <p className="mt-1 text-[11px] text-muted line-clamp-2">
                                  {item.summary || item.translator || "Bấm để đọc nội dung bài kinh."}
                                </p>
                              </div>
                              <ChevronRight
                                size={15}
                                className="mt-1 shrink-0 text-muted-foreground group-hover:text-primary"
                                aria-hidden
                              />
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                              {item.translator && <span>Dịch: {item.translator}</span>}
                              {item.reading_minutes && <span>• {item.reading_minutes} phút đọc</span>}
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar widgets */}
          <div className="space-y-8">
            <div className="bg-[#FAF5EC] dark:bg-[#201D19] border border-[#EADFC9] dark:border-[#38332C] rounded-2xl p-6 shadow-sm relative overflow-hidden">
              <span className="absolute -top-4 -left-4 text-7xl text-primary/10 select-none font-serif" aria-hidden>
                ☸
              </span>
              <div className="space-y-4 relative z-10">
                <h4 className="font-serif text-sm font-bold text-foreground flex items-center border-b border-[#EADFC9] dark:border-[#38332C] pb-2">
                  <Quote size={16} className="text-primary mr-1.5 fill-primary/10" aria-hidden />
                  <span>Lời Phật Dạy hằng ngày</span>
                </h4>
                <p className="text-sm text-[#5C4017] dark:text-[#E5DFD5] leading-relaxed italic font-serif">
                  &ldquo;{dailyQuote.text}&rdquo;
                </p>
                <p className="text-[10px] text-right font-bold text-primary uppercase tracking-wide">
                  — {dailyQuote.ref}
                </p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-border/40 pb-2">
                <h4 className="font-serif text-sm font-bold text-foreground flex items-center">
                  <Calendar size={16} className="text-primary mr-1.5" aria-hidden />
                  <span>Thời khóa sắp tới</span>
                </h4>
                <Link href="/calendar" className="text-[10px] font-bold text-primary hover:underline">
                  Lịch đầy đủ
                </Link>
              </div>
              {loading ? (
                <ListSkeleton count={2} />
              ) : events.length === 0 ? (
                <p className="text-xs text-muted italic">Không ghi nhận sự kiện.</p>
              ) : (
                <div className="space-y-3.5">
                  {events.map((e) => (
                    <Link key={e.id} href="/calendar" className="block text-xs space-y-1 group">
                      <span className="font-mono text-primary font-bold">
                        {e.start_at
                          ? new Date(e.start_at).toLocaleDateString("vi-VN")
                          : "Sắp diễn ra"}
                      </span>
                      <h5 className="font-bold text-foreground leading-snug group-hover:text-primary">
                        {e.title}
                      </h5>
                      <p className="text-[10px] text-muted-foreground">{e.location}</p>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
              <h4 className="font-serif text-sm font-bold text-foreground border-b border-border/40 pb-2 flex items-center">
                <Award size={16} className="text-primary mr-1.5" aria-hidden />
                <span>Đăng ký khóa tu mới</span>
              </h4>
              {loading ? (
                <ListSkeleton count={1} />
              ) : retreats.length === 0 ? (
                <p className="text-xs text-muted italic">Hiện không có khóa tu mở đơn.</p>
              ) : (
                <div className="space-y-4">
                  {retreats.map((r) => (
                    <div
                      key={r.id}
                      className="border border-border/60 bg-background/40 rounded-xl p-3.5 space-y-2"
                    >
                      <h5 className="font-bold text-foreground text-xs leading-snug">{r.title}</h5>
                      <div className="flex justify-between items-center text-[10px] text-muted-foreground pt-1.5 border-t border-border/20">
                        <span>
                          Còn: <strong>{r.slots_left ?? r.capacity ?? "—"}</strong> chỗ
                        </span>
                        <Link
                          href={`/retreats/${r.slug}`}
                          className="bg-primary text-primary-foreground font-bold px-3 py-1.5 rounded-full text-[10px] hover:bg-primary/95 transition-all min-h-8 inline-flex items-center"
                        >
                          Ghi danh
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-border/40 pb-2">
                <h4 className="font-serif text-sm font-bold text-foreground flex items-center">
                  <HeartHandshake size={16} className="text-primary mr-1.5" aria-hidden />
                  <span>Thiện nguyện</span>
                </h4>
                <Link href="/charity" className="text-[10px] font-bold text-primary hover:underline">
                  Chi tiết
                </Link>
              </div>
              {loading ? (
                <ListSkeleton count={1} />
              ) : charities.length === 0 ? (
                <p className="text-xs text-muted italic">Chưa có chương trình thiện nguyện.</p>
              ) : (
                <div className="space-y-4">
                  {charities.map((c) => {
                    const income = Number(c.total_income || 0);
                    const expense = Number(c.total_expense || 0);
                    const pct =
                      income > 0 ? Math.min(100, Math.round((expense / income) * 100)) : 0;
                    return (
                      <div key={c.id} className="space-y-2 text-xs">
                        <h5 className="font-bold text-foreground leading-snug">{c.title}</h5>
                        <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
                          <div className="h-full bg-calm" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          Đã triển khai {pct}% nguồn thu (chi / thu)
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="space-y-1.5">
                <h4 className="font-serif text-sm font-bold text-foreground flex items-center">
                  <Mail size={16} className="text-primary mr-1.5" aria-hidden />
                  <span>Đăng ký nhận tin Phật sự</span>
                </h4>
                <p className="text-xs text-muted leading-relaxed">
                  Nhận thông báo lịch lễ lớn, khóa tu học qua email.
                </p>
              </div>

              <form onSubmit={handleSubscribe} className="space-y-2.5">
                <input
                  required
                  type="text"
                  placeholder="Họ tên Phật tử"
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  className="bg-card w-full text-sm"
                  aria-label="Họ tên"
                />
                <input
                  required
                  type="email"
                  placeholder="Địa chỉ Email *"
                  value={subEmail}
                  onChange={(e) => setSubEmail(e.target.value)}
                  className="bg-card w-full text-sm"
                  aria-label="Email"
                />
                <label className="flex items-start space-x-2 cursor-pointer text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    required
                    checked={subConsent}
                    onChange={(e) => setSubConsent(e.target.checked)}
                    className="rounded mt-0.5 accent-primary"
                  />
                  <span>
                    Tôi đồng ý nhận thư theo{" "}
                    <Link href="/privacy" className="text-primary hover:underline">
                      chính sách bảo mật
                    </Link>
                    .
                  </span>
                </label>

                {subMessage && (
                  <p
                    className={`text-xs text-center font-medium ${
                      subSuccess ? "text-green-600" : "text-red-600"
                    }`}
                    role="status"
                  >
                    {subMessage}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={subLoading}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/95 text-sm font-bold py-2.5 rounded-lg transition-all shadow-sm min-h-11 disabled:opacity-50"
                >
                  {subLoading ? "Đang xử lý..." : "Đăng Ký Bản Tin"}
                </button>
              </form>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
