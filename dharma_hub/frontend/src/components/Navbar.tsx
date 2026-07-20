"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme, useFontSize, useAuth } from "../context/AppContext";
import SearchBar from "./SearchBar";
import NotificationsBell from "./NotificationsBell";
import {
  Sun,
  Moon,
  Type,
  Menu,
  X,
  User as UserIcon,
  Search,
  ShieldCheck,
  ChevronDown,
} from "lucide-react";

type NavLink = { href: string; label: string };
type NavGroup = { label: string; items: NavLink[] };

const learnGroup: NavGroup = {
  label: "Học pháp",
  items: [
    { href: "/sutras", label: "Kinh điển" },
    { href: "/articles", label: "Bài pháp" },
    { href: "/lectures", label: "Bài giảng" },
    { href: "/library", label: "Thư viện" },
  ],
};

const lifeGroup: NavGroup = {
  label: "Sinh hoạt",
  items: [
    { href: "/calendar", label: "Lịch Phật sự" },
    { href: "/retreats", label: "Khóa tu" },
    { href: "/charity", label: "Thiện nguyện" },
    { href: "/news", label: "Tin tức" },
  ],
};

const topLinks: NavLink[] = [
  { href: "/", label: "Trang chủ" },
  { href: "/intro", label: "Giới thiệu" },
  { href: "/contact", label: "Liên hệ" },
];

const allMobileLinks: NavLink[] = [
  ...topLinks.slice(0, 2),
  ...learnGroup.items,
  ...lifeGroup.items,
  topLinks[2],
];

export default function Navbar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { increaseFontSize, decreaseFontSize, fontSize } = useFontSize();
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const navRef = useRef<HTMLElement | null>(null);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const groupActive = (group: NavGroup) => group.items.some((i) => isActive(i.href));

  useEffect(() => {
    setMobileOpen(false);
    setSearchOpen(false);
    setOpenGroup(null);
  }, [pathname]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenGroup(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenGroup(null);
        setMobileOpen(false);
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const renderDropdown = (group: NavGroup) => {
    const active = groupActive(group);
    const open = openGroup === group.label;
    return (
      <div className="relative" key={group.label}>
        <button
          type="button"
          className={`inline-flex items-center gap-1 rounded-md px-2.5 xl:px-3 py-2 text-sm font-medium transition-colors min-h-10 ${
            active || open
              ? "bg-primary/10 text-primary"
              : "text-muted hover:bg-muted-foreground/10 hover:text-foreground"
          }`}
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={() => setOpenGroup(open ? null : group.label)}
        >
          <span>{group.label}</span>
          <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        {open && (
          <div
            role="menu"
            className="absolute left-0 top-full mt-1 w-48 rounded-xl border border-border bg-card shadow-lg p-1.5 z-50 fade-in"
          >
            {group.items.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                role="menuitem"
                aria-current={isActive(link.href) ? "page" : undefined}
                className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive(link.href)
                    ? "bg-primary/10 text-primary"
                    : "text-muted hover:bg-muted-foreground/10 hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <nav
      ref={navRef}
      className="sticky top-0 z-50 w-full border-b border-border bg-card/90 backdrop-blur-md transition-colors duration-200"
      aria-label="Điều hướng chính"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-3">
          <Link href="/" className="flex items-center space-x-2 shrink-0" aria-label="Dharma Hub - Trang chủ">
            <span className="text-2xl font-serif text-primary" aria-hidden>
              ☸
            </span>
            <span className="font-serif text-xl font-bold tracking-wide text-foreground">Dharma Hub</span>
          </Link>

          {/* Desktop nav — show from lg up; tablet uses hamburger */}
          <div className="hidden lg:flex lg:items-center lg:gap-0.5 xl:gap-1">
            {topLinks.slice(0, 2).map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive(link.href) ? "page" : undefined}
                className={`rounded-md px-2.5 xl:px-3 py-2 text-sm font-medium transition-colors min-h-10 inline-flex items-center ${
                  isActive(link.href)
                    ? "bg-primary/10 text-primary"
                    : "text-muted hover:bg-muted-foreground/10 hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
            {renderDropdown(learnGroup)}
            {renderDropdown(lifeGroup)}
            <Link
              href="/contact"
              aria-current={isActive("/contact") ? "page" : undefined}
              className={`rounded-md px-2.5 xl:px-3 py-2 text-sm font-medium transition-colors min-h-10 inline-flex items-center ${
                isActive("/contact")
                  ? "bg-primary/10 text-primary"
                  : "text-muted hover:bg-muted-foreground/10 hover:text-foreground"
              }`}
            >
              Liên hệ
            </Link>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5">
            <NotificationsBell />

            <button
              type="button"
              onClick={() => setSearchOpen((v) => !v)}
              className="rounded-full p-2.5 text-muted hover:bg-muted-foreground/10 hover:text-foreground transition-colors min-h-11 min-w-11 inline-flex items-center justify-center"
              title="Tìm kiếm"
              aria-label="Mở tìm kiếm"
              aria-expanded={searchOpen}
            >
              <Search size={18} />
            </button>

            <div className="hidden sm:flex items-center border border-border rounded-md px-1 bg-background/50">
              <button
                type="button"
                onClick={decreaseFontSize}
                className="p-2 text-xs font-semibold text-muted hover:text-foreground min-h-10 min-w-9"
                title="Giảm cỡ chữ"
                aria-label="Giảm cỡ chữ"
              >
                A-
              </button>
              <span className="text-[10px] text-muted-foreground px-1 border-x border-border font-mono" title={`Cỡ chữ ${fontSize}px`}>
                <Type size={12} className="inline" aria-hidden />
              </span>
              <button
                type="button"
                onClick={increaseFontSize}
                className="p-2 text-xs font-semibold text-muted hover:text-foreground min-h-10 min-w-9"
                title="Tăng cỡ chữ"
                aria-label="Tăng cỡ chữ"
              >
                A+
              </button>
            </div>

            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-full p-2.5 text-muted hover:bg-muted-foreground/10 hover:text-foreground transition-colors min-h-11 min-w-11 inline-flex items-center justify-center"
              title={theme === "light" ? "Chế độ tối" : "Chế độ sáng"}
              aria-label={theme === "light" ? "Bật chế độ tối" : "Bật chế độ sáng"}
            >
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            <div className="hidden sm:flex items-center">
              {user ? (
                <div className="flex items-center space-x-2 pl-2 border-l border-border">
                  {(user.is_super_admin || user.role_names?.length > 0) && (
                    <Link
                      href="/admin/dashboard"
                      className="flex items-center space-x-1 text-xs bg-primary text-primary-foreground font-semibold px-2.5 py-1.5 rounded-full hover:bg-primary/90 transition-colors min-h-9"
                    >
                      <ShieldCheck size={14} />
                      <span>CMS</span>
                    </Link>
                  )}
                  <Link
                    href="/account"
                    className="flex items-center space-x-1 text-sm text-foreground hover:text-primary transition-colors font-medium min-h-9"
                  >
                    <UserIcon size={16} />
                    <span className="max-w-[80px] truncate">{user.full_name}</span>
                  </Link>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="flex items-center space-x-1 text-xs font-semibold border border-primary text-primary hover:bg-primary hover:text-primary-foreground px-3 py-2 rounded-full transition-colors min-h-9"
                >
                  <UserIcon size={14} />
                  <span>Đăng nhập</span>
                </Link>
              )}
            </div>

            {/* Hamburger: mobile + tablet (< lg) */}
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2.5 text-muted min-h-11 min-w-11 inline-flex items-center justify-center"
              aria-label={mobileOpen ? "Đóng menu" : "Mở menu"}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Expandable search panel */}
        {searchOpen && (
          <div className="pb-3 fade-in">
            <SearchBar autoFocus onNavigate={() => setSearchOpen(false)} />
          </div>
        )}
      </div>

      {/* Mobile / tablet drawer */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-border bg-card fade-in">
          <div className="space-y-1 px-3 pb-4 pt-2 max-h-[70vh] overflow-y-auto">
            <div className="px-1 py-2">
              <SearchBar onNavigate={() => setMobileOpen(false)} />
            </div>

            <p className="px-3 pt-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Điều hướng
            </p>
            {allMobileLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                aria-current={isActive(link.href) ? "page" : undefined}
                className={`block rounded-md px-3 py-3 text-base font-medium transition-colors min-h-11 ${
                  isActive(link.href)
                    ? "bg-primary/10 text-primary"
                    : "text-muted hover:bg-muted-foreground/10 hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}

            <div className="flex items-center justify-between px-3 py-3 border-t border-border mt-2">
              <span className="text-sm font-medium text-muted">Cỡ chữ</span>
              <div className="flex items-center border border-border rounded-md px-1 bg-background">
                <button type="button" onClick={decreaseFontSize} className="px-3 py-2 text-sm font-bold text-muted min-h-10" aria-label="Giảm cỡ chữ">
                  A-
                </button>
                <span className="text-xs text-muted px-2 border-x border-border font-mono">{fontSize}</span>
                <button type="button" onClick={increaseFontSize} className="px-3 py-2 text-sm font-bold text-muted min-h-10" aria-label="Tăng cỡ chữ">
                  A+
                </button>
              </div>
            </div>

            <div className="px-3 py-3 border-t border-border">
              {user ? (
                <div className="flex items-center justify-between gap-2">
                  <Link
                    href="/account"
                    onClick={() => setMobileOpen(false)}
                    className="text-sm font-semibold text-foreground flex items-center space-x-1 min-h-11"
                  >
                    <UserIcon size={16} />
                    <span>{user.full_name}</span>
                  </Link>
                  {(user.is_super_admin || user.role_names?.length > 0) && (
                    <Link
                      href="/admin/dashboard"
                      onClick={() => setMobileOpen(false)}
                      className="text-xs bg-primary text-primary-foreground font-semibold px-3 py-2 rounded-full min-h-9 inline-flex items-center"
                    >
                      Quản trị CMS
                    </Link>
                  )}
                </div>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="block text-center text-sm font-semibold bg-primary text-primary-foreground py-3 rounded-md min-h-11"
                >
                  Đăng nhập tài khoản
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
