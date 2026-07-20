"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/services/api";
import {
  BookOpen,
  PlayCircle,
  Calendar,
  HeartHandshake,
  Mail,
  Users2,
  History,
  Loader2,
  ArrowUpRight,
  ShieldCheck,
  PenTool,
  FileText,
  Image as ImageIcon,
  UserRound,
  Tags,
} from "lucide-react";

async function fetchTotal(path: string): Promise<number> {
  try {
    const res = await api(`${path}${path.includes("?") ? "&" : "?"}page_size=1`);
    if (typeof res?.total === "number") return res.total;
    if (Array.isArray(res?.items)) return res.items.length;
    if (Array.isArray(res)) return res.length;
    return 0;
  } catch {
    return 0;
  }
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    sutras: 0,
    lectures: 0,
    articles: 0,
    retreats: 0,
    media: 0,
    teachers: 0,
    categories: 0,
    contacts: 0,
    subscribers: 0,
    charities: 0,
    events: 0,
    news: 0,
  });
  const [recentAudits, setRecentAudits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true);
      setLoadError("");
      try {
        // Mỗi API riêng — lỗi 1 module không kéo cả bảng về 0
        const [
          sutras,
          lectures,
          articles,
          retreats,
          media,
          teachers,
          categories,
          contacts,
          subscribers,
          charities,
          events,
          news,
        ] = await Promise.all([
          fetchTotal("/sutras"),
          fetchTotal("/lectures"),
          fetchTotal("/dharma_talks"),
          fetchTotal("/retreats"),
          fetchTotal("/media_assets"),
          fetchTotal("/teachers"),
          fetchTotal("/categories"),
          fetchTotal("/contact_messages"),
          fetchTotal("/subscribers"),
          fetchTotal("/charity_programs"),
          fetchTotal("/events"),
          fetchTotal("/news_posts"),
        ]);

        setStats({
          sutras,
          lectures,
          articles,
          retreats,
          media,
          teachers,
          categories,
          contacts,
          subscribers,
          charities,
          events,
          news,
        });

        // Audit: lấy từ 1–2 module gần đây (không có /audit_logs global)
        try {
          const [a1, a2] = await Promise.all([
            api("/sutras?page_size=1").then(async (r) => {
              const id = r?.items?.[0]?.id;
              if (!id) return [];
              const logs = await api(`/sutras/${id}/audit?page_size=5`).catch(() => ({ items: [] }));
              return logs.items || [];
            }),
            api("/lectures?page_size=1").then(async (r) => {
              const raw = r?.items?.[0];
              const id = raw?.id ?? raw?.data?.id;
              if (!id) return [];
              const logs = await api(`/lectures/${id}/audit?page_size=5`).catch(() => ({ items: [] }));
              return logs.items || [];
            }),
          ]);
          const merged = [...(a1 || []), ...(a2 || [])]
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 8);
          setRecentAudits(merged);
        } catch {
          setRecentAudits([]);
        }
      } catch (err) {
        console.error("Error fetching dashboard statistics:", err);
        setLoadError("Một số thống kê không tải được — kiểm tra quyền đăng nhập.");
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  const cardItems = [
    { label: "Kinh điển", count: stats.sutras, icon: <BookOpen size={22} />, href: "/admin/sutras", color: "text-amber-600 bg-amber-50 dark:bg-amber-950/20" },
    { label: "Bài giảng", count: stats.lectures, icon: <PlayCircle size={22} />, href: "/admin/lectures", color: "text-blue-600 bg-blue-50 dark:bg-blue-950/20" },
    { label: "Bài pháp", count: stats.articles, icon: <FileText size={22} />, href: "/admin/articles", color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/20" },
    { label: "Khóa tu", count: stats.retreats, icon: <Calendar size={22} />, href: "/admin/retreats", color: "text-green-600 bg-green-50 dark:bg-green-950/20" },
    { label: "Media", count: stats.media, icon: <ImageIcon size={22} />, href: "/admin/media", color: "text-pink-600 bg-pink-50 dark:bg-pink-950/20" },
    { label: "Giảng sư", count: stats.teachers, icon: <UserRound size={22} />, href: "/admin/teachers", color: "text-orange-600 bg-orange-50 dark:bg-orange-950/20" },
    { label: "Danh mục", count: stats.categories, icon: <Tags size={22} />, href: "/admin/categories", color: "text-cyan-600 bg-cyan-50 dark:bg-cyan-950/20" },
    { label: "Thiện nguyện", count: stats.charities, icon: <HeartHandshake size={22} />, href: "/admin/charities", color: "text-purple-600 bg-purple-50 dark:bg-purple-950/20" },
    { label: "Lịch Phật sự", count: stats.events ?? 0, icon: <Calendar size={22} />, href: "/admin/events", color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20" },
    { label: "Tin / TB", count: stats.news ?? 0, icon: <FileText size={22} />, href: "/admin/news", color: "text-sky-600 bg-sky-50 dark:bg-sky-950/20" },
    { label: "Thư liên hệ", count: stats.contacts, icon: <Mail size={22} />, href: "/admin/contacts", color: "text-teal-600 bg-teal-50 dark:bg-teal-950/20" },
    { label: "Nhận tin", count: stats.subscribers, icon: <Users2 size={22} />, href: "/admin/subscribers", color: "text-slate-600 bg-slate-50 dark:bg-slate-900/30" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-muted">
        <Loader2 className="animate-spin mr-2 text-primary" size={24} />
        <span className="text-sm font-semibold">Đang tải dữ liệu tổng quan...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 fade-in">
      <section className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="font-serif text-2xl font-bold text-foreground">Bảng Điều Khiển Hệ Thống</h1>
          <p className="text-xs text-muted font-medium">
            Xin chào Ban quản lý Đạo tràng. Chúc một ngày hành sự chánh niệm và an lạc.
          </p>
          {loadError && <p className="text-xs text-amber-700">{loadError}</p>}
        </div>
        <Link
          href="/admin/sutras"
          className="flex items-center space-x-1.5 bg-primary text-primary-foreground hover:bg-primary/95 px-4 py-2 rounded-lg text-xs font-semibold transition-colors"
        >
          <PenTool size={14} />
          <span>Biên tập nội dung mới</span>
        </Link>
      </section>

      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {cardItems.map((card, idx) => (
          <Link
            key={idx}
            href={card.href}
            className="bg-card border border-border rounded-xl p-4 shadow-sm hover:border-primary/20 transition-all group flex flex-col justify-between min-h-[110px]"
          >
            <div className="flex justify-between items-start">
              <span className={`p-2.5 rounded-lg ${card.color}`}>{card.icon}</span>
              <ArrowUpRight size={14} className="text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="mt-3">
              <span className="text-[11px] text-muted font-semibold block">{card.label}</span>
              <span className="text-2xl font-bold text-foreground block font-mono mt-0.5">{card.count}</span>
            </div>
          </Link>
        ))}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="font-serif text-sm font-bold text-foreground border-b border-border/60 pb-2.5 flex items-center">
              <ShieldCheck size={16} className="mr-1.5 text-primary" />
              <span>Gợi ý biên tập</span>
            </h3>
            <ul className="list-disc pl-5 text-xs text-muted space-y-2.5">
              <li>
                <strong>Giảng sư:</strong> chưa rõ ai thuyết thì để trống — không bắt buộc.
              </li>
              <li>
                <strong>Danh mục / Nhà sư:</strong> quản lý tại menu bên trái (Danh mục, Giảng sư).
              </li>
              <li>
                <strong>Nguồn kinh:</strong> ghi rõ dịch giả / nguồn xuất bản khi biết.
              </li>
            </ul>
          </div>
        </div>

        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
          <h3 className="font-serif text-sm font-bold text-foreground flex items-center border-b border-border/40 pb-2.5">
            <History className="text-primary mr-1.5" size={18} />
            <span>Nhật ký gần đây (mẫu từ kinh / bài giảng)</span>
          </h3>

          {recentAudits.length === 0 ? (
            <p className="text-xs text-muted italic">Chưa có nhật ký gần đây.</p>
          ) : (
            <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
              {recentAudits.map((log: any) => (
                <div
                  key={log.id}
                  className="text-xs border-b border-border/30 pb-3 last:border-0 last:pb-0 flex items-start justify-between gap-4 font-medium"
                >
                  <div className="space-y-1">
                    <p className="text-foreground">
                      <span className="font-mono font-bold text-primary mr-1.5">
                        {log.actor_email || "System"}
                      </span>
                      <span>
                        thao tác <strong className="uppercase text-[10px]">{log.action}</strong> · {log.module}
                      </span>
                    </p>
                    {log.summary && (
                      <span className="text-[10px] text-muted-foreground">{log.summary}</span>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                    {log.created_at ? new Date(log.created_at).toLocaleString("vi-VN") : "—"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
