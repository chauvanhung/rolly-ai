"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AppContext";
import {
  ShieldCheck,
  LayoutDashboard,
  BookOpen,
  FileText,
  PlayCircle,
  Calendar,
  Mail,
  Users2,
  ArrowLeft,
  LogOut,
  Loader2,
  Menu,
  X,
  Image as ImageIcon,
  UserCog,
  UserRound,
  Tags,
  Newspaper,
  HeartHandshake,
  CalendarDays,
} from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logoutUser } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/login");
      return;
    }

    const isAdmin = user.is_super_admin || (user.role_names && user.role_names.length > 0);
    if (!isAdmin) {
      alert("Tài khoản của bạn không có quyền truy cập trang quản trị CMS.");
      router.push("/account");
    }
  }, [user, loading, router]);

  const menuItems = [
    { href: "/admin/dashboard", label: "Bảng tổng quan", icon: <LayoutDashboard size={16} /> },
    { href: "/admin/users", label: "Người dùng", icon: <UserCog size={16} /> },
    { href: "/admin/sutras", label: "Kinh điển", icon: <BookOpen size={16} /> },
    { href: "/admin/articles", label: "Bài pháp", icon: <FileText size={16} /> },
    { href: "/admin/lectures", label: "Bài giảng", icon: <PlayCircle size={16} /> },
    { href: "/admin/events", label: "Lịch Phật sự", icon: <CalendarDays size={16} /> },
    { href: "/admin/retreats", label: "Khóa tu học", icon: <Calendar size={16} /> },
    { href: "/admin/news", label: "Tin / Thông báo", icon: <Newspaper size={16} /> },
    { href: "/admin/charities", label: "Thiện nguyện", icon: <HeartHandshake size={16} /> },
    { href: "/admin/teachers", label: "Giảng sư / Nhà sư", icon: <UserRound size={16} /> },
    { href: "/admin/categories", label: "Danh mục", icon: <Tags size={16} /> },
    { href: "/admin/media", label: "Thư viện Media", icon: <ImageIcon size={16} /> },
    { href: "/admin/contacts", label: "Thư liên hệ", icon: <Mail size={16} /> },
    { href: "/admin/subscribers", label: "Người nhận tin", icon: <Users2 size={16} /> },
  ];

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const handleLogout = () => {
    logoutUser();
    router.push("/login");
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen text-muted bg-[#12110F] font-sans">
        <Loader2 className="animate-spin mr-2 text-primary" size={24} />
        <span className="text-sm font-semibold text-gray-300">Đang kiểm tra quyền hạn CMS...</span>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50/50 dark:bg-[#12110F] text-foreground font-sans antialiased transition-colors duration-200">
      <aside className="hidden lg:flex flex-col w-64 bg-card border-r border-border h-screen sticky top-0">
        <div className="h-16 flex items-center px-6 border-b border-border space-x-2">
          <span className="text-2xl text-primary select-none" aria-hidden>
            ☸
          </span>
          <span className="font-serif text-lg font-bold tracking-wide text-foreground">Dharma Hub CMS</span>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto" aria-label="Menu quản trị">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={`flex items-center space-x-2.5 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-11 ${
                isActive(item.href)
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "text-muted hover:bg-muted-foreground/10 hover:text-foreground"
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-border space-y-2">
          <Link
            href="/"
            className="flex items-center justify-center space-x-1.5 w-full border border-border bg-background hover:bg-muted-foreground/10 text-xs font-semibold py-2.5 rounded-lg transition-colors min-h-10"
          >
            <ArrowLeft size={13} />
            <span>Về trang chủ</span>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center justify-center space-x-1.5 w-full border border-red-200 hover:bg-red-50 dark:border-red-950 dark:hover:bg-red-950/20 text-red-600 text-xs font-semibold py-2.5 rounded-lg transition-colors min-h-10"
          >
            <LogOut size={13} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30">
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 text-muted lg:hidden rounded-md hover:bg-muted-foreground/10 min-h-11 min-w-11"
            aria-label="Mở menu quản trị"
          >
            <Menu size={22} />
          </button>

          <span className="hidden sm:inline-flex text-xs font-bold text-muted items-center">
            <ShieldCheck size={14} className="mr-1.5 text-primary" aria-hidden />
            <span>Phần hệ quản trị nội dung Phật giáo</span>
          </span>

          <div className="flex items-center space-x-4">
            <span className="text-xs font-semibold text-foreground bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full">
              Quản trị: {user.full_name}
            </span>
          </div>
        </header>

        <main id="main-content" className="flex-grow p-4 sm:p-6 lg:p-8 overflow-y-auto font-sans">
          {children}
        </main>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden fade-in">
          <div className="fixed inset-0 bg-black/60" onClick={() => setMobileOpen(false)} aria-hidden />
          <aside className="relative flex flex-col w-64 bg-card h-full border-r border-border max-w-xs animate-slideIn">
            <div className="h-16 flex items-center justify-between px-6 border-b border-border">
              <div className="flex items-center space-x-2">
                <span className="text-2xl text-primary select-none" aria-hidden>
                  ☸
                </span>
                <span className="font-serif text-base font-bold">Dharma CMS</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="p-2 text-muted min-h-11"
                aria-label="Đóng menu"
              >
                <X size={20} />
              </button>
            </div>

            <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto" onClick={() => setMobileOpen(false)}>
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-11 ${
                    isActive(item.href)
                      ? "bg-primary text-primary-foreground"
                      : "text-muted hover:bg-muted-foreground/10 hover:text-foreground"
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>

            <div className="p-4 border-t border-border space-y-2">
              <Link
                href="/"
                className="flex items-center justify-center space-x-1.5 w-full border border-border text-xs font-semibold py-2.5 rounded-lg"
              >
                <ArrowLeft size={13} />
                <span>Về trang chủ</span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center justify-center space-x-1.5 w-full bg-red-600 text-white text-xs font-semibold py-2.5 rounded-lg min-h-10"
              >
                <LogOut size={13} />
                <span>Đăng xuất</span>
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
