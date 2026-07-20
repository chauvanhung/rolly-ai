"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck, Calendar, X } from "lucide-react";
import { api } from "@/services/api";
import {
  festivalsToNotifications,
  getUpcomingFestivals,
  type AppNotification,
} from "@/lib/buddhistFestivals";

const READ_KEY = "dharma_notify_read_ids";

function loadReadIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(READ_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveReadIds(ids: Set<string>) {
  localStorage.setItem(READ_KEY, JSON.stringify([...ids]));
}

export default function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const buildNotifications = useCallback(async () => {
    setLoading(true);
    const now = new Date();
    const fest = festivalsToNotifications(getUpcomingFestivals(now, 21), now);

    let eventNotes: AppNotification[] = [];
    try {
      const events = await api("/public/calendar");
      const list = Array.isArray(events) ? events : [];
      eventNotes = list
        .filter((e: any) => e.start_at)
        .map((e: any) => {
          const d = new Date(e.start_at);
          const days = Math.round(
            (new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() -
              new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) /
              (1000 * 60 * 60 * 24)
          );
          return { e, days };
        })
        .filter(({ days }: { days: number }) => days >= -1 && days <= 14)
        .sort((a: any, b: any) => a.days - b.days)
        .slice(0, 8)
        .map(({ e, days }: { e: any; days: number }) => {
          const when =
            days === 0
              ? "Hôm nay"
              : days === 1
              ? "Ngày mai"
              : days < 0
              ? "Vừa diễn ra"
              : `Còn ${days} ngày`;
          return {
            id: `evt-${e.id}`,
            title: `📅 ${e.title || "Sự kiện Phật sự"}`,
            body: `${when} · ${new Date(e.start_at).toLocaleString("vi-VN")}${
              e.location ? ` · ${e.location}` : ""
            }`,
            createdAt: e.start_at,
            href: "/calendar",
            kind: "event" as const,
            emoji: "📅",
          };
        });
    } catch {
      /* ignore calendar errors */
    }

    // Ưu tiên lễ lớn + sự kiện sắp tới
    const merged = [...fest, ...eventNotes];
    const seen = new Set<string>();
    const unique = merged.filter((n) => {
      if (seen.has(n.id)) return false;
      seen.add(n.id);
      return true;
    });
    setItems(unique);
    setReadIds(loadReadIds());
    setLoading(false);
  }, []);

  useEffect(() => {
    void buildNotifications();
  }, [buildNotifications]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const unread = useMemo(() => items.filter((i) => !readIds.has(i.id)), [items, readIds]);

  const markAllRead = () => {
    const next = new Set(readIds);
    items.forEach((i) => next.add(i.id));
    setReadIds(next);
    saveReadIds(next);
  };

  const markRead = (id: string) => {
    const next = new Set(readIds);
    next.add(id);
    setReadIds(next);
    saveReadIds(next);
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-full p-2.5 text-muted hover:bg-muted-foreground/10 hover:text-foreground transition-colors min-h-11 min-w-11 inline-flex items-center justify-center"
        title="Thông báo"
        aria-label="Thông báo"
        aria-expanded={open}
      >
        <Bell size={18} className={unread.length ? "text-primary" : undefined} />
        {unread.length > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[1.1rem] h-[1.1rem] px-0.5 rounded-full bg-accent text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Bảng thông báo"
          className="absolute right-0 top-full mt-2 w-[min(22rem,calc(100vw-1.5rem))] rounded-2xl border border-border bg-card shadow-xl z-[60] overflow-hidden fade-in"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-primary/5">
            <div>
              <p className="text-sm font-bold text-foreground">Thông báo</p>
              <p className="text-[10px] text-muted">Lễ Phật giáo & lịch Phật sự sắp tới</p>
            </div>
            <div className="flex items-center gap-1">
              {unread.length > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-bold text-primary hover:bg-primary/10"
                  title="Đánh dấu đã đọc hết"
                >
                  <CheckCheck size={14} />
                  Đã đọc
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-muted hover:bg-muted/40"
                aria-label="Đóng"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="max-h-[22rem] overflow-y-auto">
            {loading ? (
              <p className="p-4 text-xs text-muted">Đang tải thông báo…</p>
            ) : items.length === 0 ? (
              <div className="p-6 text-center space-y-2">
                <Calendar className="mx-auto text-primary/50" size={28} />
                <p className="text-xs text-muted">Không có lễ hoặc sự kiện trong 3 tuần tới.</p>
                <Link href="/calendar" className="text-[11px] font-bold text-primary hover:underline" onClick={() => setOpen(false)}>
                  Xem lịch Phật sự
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {items.map((n) => {
                  const unreadItem = !readIds.has(n.id);
                  return (
                    <li key={n.id}>
                      <Link
                        href={n.href || "/calendar"}
                        onClick={() => {
                          markRead(n.id);
                          setOpen(false);
                        }}
                        className={`block px-4 py-3 hover:bg-muted/30 transition-colors ${
                          unreadItem ? "bg-primary/5" : ""
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {unreadItem && (
                            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" aria-hidden />
                          )}
                          <div className={unreadItem ? "" : "pl-3.5"}>
                            <p className="text-xs font-bold text-foreground leading-snug">{n.title}</p>
                            <p className="text-[11px] text-muted mt-0.5 leading-relaxed">{n.body}</p>
                          </div>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="border-t border-border px-4 py-2.5 bg-muted/20">
            <Link
              href="/calendar"
              onClick={() => setOpen(false)}
              className="text-[11px] font-bold text-primary hover:underline"
            >
              Mở lịch Phật sự đầy đủ →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
