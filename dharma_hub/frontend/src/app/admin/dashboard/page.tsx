"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/services/api";
import { 
  BookOpen, PlayCircle, Calendar, HeartHandshake, Mail, 
  Users2, History, Loader2, ArrowUpRight, ShieldCheck, PenTool
} from "lucide-react";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    sutras: 0,
    lectures: 0,
    retreats: 0,
    charities: 0,
    contacts: 0,
    subscribers: 0,
  });
  const [recentAudits, setRecentAudits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true);
      try {
        // Query generic list endpoints with page_size=1 to extract totals
        const [sutRes, lecRes, retRes, chaRes, conRes, subRes, auditRes] = await Promise.all([
          api("/sutras?page_size=1"),
          api("/lectures?page_size=1"),
          api("/retreats?page_size=1"),
          api("/charities?page_size=1"),
          api("/contact_messages?page_size=1"),
          api("/subscribers?page_size=1"),
          // Fetch overall audit logs (using generic system logs or fallback)
          api("/audit_logs?page_size=5").catch(() => ({ items: [] })),
        ]);

        setStats({
          sutras: sutRes.total || 0,
          lectures: lecRes.total || 0,
          retreats: retRes.total || 0,
          charities: chaRes.total || 0,
          contacts: conRes.total || 0,
          subscribers: subRes.total || 0,
        });

        setRecentAudits(auditRes.items || []);
      } catch (err) {
        console.error("Error fetching dashboard statistics:", err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  const cardItems = [
    { label: "Kinh điển Pháp bảo", count: stats.sutras, icon: <BookOpen size={24} />, href: "/admin/sutras", color: "text-amber-600 bg-amber-50 dark:bg-amber-950/20" },
    { label: "Bài giảng thoại", count: stats.lectures, icon: <PlayCircle size={24} />, href: "/admin/lectures", color: "text-blue-600 bg-blue-50 dark:bg-blue-950/20" },
    { label: "Khóa tu đang mở", count: stats.retreats, icon: <Calendar size={24} />, href: "/admin/retreats", color: "text-green-600 bg-green-50 dark:bg-green-950/20" },
    { label: "Quyên góp Thiện nguyện", count: stats.charities, icon: <HeartHandshake size={24} />, href: "/admin/charities", color: "text-purple-600 bg-purple-50 dark:bg-purple-950/20" },
    { label: "Thư liên hệ góp ý", count: stats.contacts, icon: <Mail size={24} />, href: "/admin/contacts", color: "text-teal-600 bg-teal-50 dark:bg-teal-950/20" },
    { label: "Đăng ký nhận tin", count: stats.subscribers, icon: <Users2 size={24} />, href: "/admin/subscribers", color: "text-slate-600 bg-slate-50 dark:bg-slate-900/30" },
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
      {/* Welcome Banner */}
      <section className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="font-serif text-2xl font-bold text-foreground">Bảng Điều Khiển Hệ Thống</h1>
          <p className="text-xs text-muted font-medium">Xin chào Ban quản lý Đạo tràng. Chúc một ngày hành sự chánh niệm và an lạc.</p>
        </div>
        <Link
          href="/admin/sutras"
          className="flex items-center space-x-1.5 bg-primary text-primary-foreground hover:bg-primary/95 px-4 py-2 rounded-lg text-xs font-semibold transition-colors"
        >
          <PenTool size={14} />
          <span>Biên tập nội dung mới</span>
        </Link>
      </section>

      {/* Grid statistics cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        {cardItems.map((card, idx) => (
          <Link
            key={idx}
            href={card.href}
            className="bg-card border border-border rounded-xl p-5 shadow-sm hover:border-primary/20 transition-all group flex flex-col justify-between"
          >
            <div className="flex justify-between items-start">
              <span className={`p-3 rounded-lg ${card.color}`}>{card.icon}</span>
              <ArrowUpRight size={16} className="text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="mt-4">
              <span className="text-xs text-muted font-semibold block">{card.label}</span>
              <span className="text-2xl font-bold text-foreground block font-mono mt-0.5">{card.count}</span>
            </div>
          </Link>
        ))}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Quick Links & Guide */}
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="font-serif text-sm font-bold text-foreground border-b border-border/60 pb-2.5 flex items-center">
              <ShieldCheck size={16} className="mr-1.5 text-primary" />
              <span>Tiêu chuẩn biên soạn Phật giáo</span>
            </h3>
            <ul className="list-disc pl-5 text-xs text-muted space-y-2.5">
              <li><strong>Trang nghiêm:</strong> Sử dụng ngôn từ ôn hòa, xưng hô tôn kính với bậc Đại Đức Tăng Ni, Giảng Sư.</li>
              <li><strong>Chính xác:</strong> Chỉ trích dẫn nguồn kinh tạng dịch giả chính thống, ghi rõ nguồn xuất bản.</li>
              <li><strong>Khách quan:</strong> Tuyệt đối không đăng tải quảng cáo thương mại hoặc lồng ghép bài viết mê tín dị đoan.</li>
            </ul>
          </div>
        </div>

        {/* Right: System Audit Feed */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
          <h3 className="font-serif text-sm font-bold text-foreground flex items-center border-b border-border/40 pb-2.5">
            <History className="text-primary mr-1.5" size={18} />
            <span>Nhật ký hoạt động hệ thống gần đây</span>
          </h3>

          {recentAudits.length === 0 ? (
            <p className="text-xs text-muted italic">Chưa ghi nhận hoạt động nào gần đây trong phiên.</p>
          ) : (
            <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
              {recentAudits.map((log: any) => (
                <div key={log.id} className="text-xs border-b border-border/30 pb-3 last:border-0 last:pb-0 flex items-start justify-between gap-4 font-medium">
                  <div className="space-y-1">
                    <p className="text-foreground">
                      <span className="font-mono font-bold text-primary mr-1.5">{log.actor_email || "System"}</span>
                      <span>đã thực hiện thao tác <strong className="text-foreground uppercase text-[10px]">{log.action}</strong> trên module {log.module}</span>
                    </p>
                    <span className="text-[10px] text-muted-foreground font-mono">IP: {log.ip_address || "—"}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                    {new Date(log.created_at).toLocaleTimeString("vi-VN")}
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
