"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { X, CalendarHeart } from "lucide-react";
import {
  formatFestivalDate,
  getActiveFestivalMood,
  type Festival,
} from "@/lib/buddhistFestivals";
import FestivalAmbient from "@/components/festival/FestivalAmbient";
import { LotusIcon } from "@/components/festival/LotusSvg";

const BANNER_DISMISS_KEY = "dharma_festival_banner_dismiss";

type Mood = { festival: Festival | null; days: number; active: boolean };

/**
 * Banner + ambient hoa sen / pháp luân khi sắp tới lễ Phật.
 * Demo: truyền forceMood từ trang /demo/festival
 */
export default function FestivalAtmosphere({
  forceMood,
  forceShowAmbient = false,
}: {
  forceMood?: Mood | null;
  forceShowAmbient?: boolean;
}) {
  const [mood, setMood] = useState<Mood>({
    festival: null,
    days: 999,
    active: false,
  });
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (forceMood) {
      setMood(forceMood);
      setDismissed(false);
      return;
    }
    const m = getActiveFestivalMood(new Date());
    if (m.festival && m.days <= 14) {
      setMood({ ...m, active: true });
      try {
        const raw = localStorage.getItem(BANNER_DISMISS_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        setDismissed(parsed?.id === m.festival.id);
      } catch {
        setDismissed(false);
      }
    } else {
      setMood({ festival: null, days: 999, active: false });
      setDismissed(true);
    }
  }, [forceMood]);

  const showAmbient =
    forceShowAmbient ||
    (mood.active && mood.festival && mood.days <= 7 && !dismissed);

  const showBanner = mood.festival && mood.active && !dismissed;

  if (!showAmbient && !showBanner) return null;

  const f = mood.festival;
  const days = mood.days;
  const dayLabel =
    days === 0 ? "Hôm nay" : days === 1 ? "Ngày mai" : days < 0 ? "Vừa qua" : `Còn ${days} ngày`;
  const isToday = days === 0;
  const intensity = f?.intensity || "medium";

  const dismiss = () => {
    if (!f) return;
    setDismissed(true);
    if (!forceMood) {
      localStorage.setItem(BANNER_DISMISS_KEY, JSON.stringify({ id: f.id, at: Date.now() }));
    }
  };

  return (
    <>
      {showAmbient && (
        <FestivalAmbient intensity={intensity} force={forceShowAmbient || !!forceMood} />
      )}

      {showBanner && f && (
        <div
          className={`relative z-[45] border-b festival-banner-in overflow-hidden ${
            isToday
              ? "border-primary/40 bg-gradient-to-r from-[#faf6ee] via-[#f3e8c8]/90 to-[#faf6ee] dark:from-[#2a2418] dark:via-[#3d3420]/70 dark:to-[#2a2418]"
              : "border-primary/15 bg-gradient-to-r from-card via-primary/[0.04] to-card"
          }`}
          role="region"
          aria-label="Thông báo lễ Phật giáo"
        >
          {/* Hoa sen trang trí hai góc banner */}
          <div className="pointer-events-none absolute -left-2 -bottom-3 opacity-25 dark:opacity-15" aria-hidden>
            <LotusIcon size={64} />
          </div>
          <div className="pointer-events-none absolute -right-3 -top-2 opacity-20 dark:opacity-12 scale-x-[-1]" aria-hidden>
            <LotusIcon size={56} />
          </div>

          {days <= 3 && (
            <div className="festival-shimmer pointer-events-none absolute inset-x-0 top-0 h-px" aria-hidden />
          )}

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-card/80 shadow-sm ${
                  isToday ? "border-primary/50 festival-icon-soft" : "border-primary/20"
                }`}
                aria-hidden
              >
                <LotusIcon size={26} />
              </span>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-semibold text-foreground leading-snug">
                  <span className="text-primary font-bold">{dayLabel}</span>
                  <span className="mx-1.5 text-muted-foreground">·</span>
                  <span className="font-serif">{f.name}</span>
                </p>
                <p className="text-[11px] text-muted mt-0.5 line-clamp-1">
                  {formatFestivalDate(f.date)} — {f.description}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link
                href={f.href || "/calendar"}
                className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-[11px] font-bold text-primary hover:bg-primary/15 transition-colors"
              >
                <CalendarHeart size={13} />
                Lịch Phật sự
              </Link>
              <button
                type="button"
                onClick={dismiss}
                className="p-1.5 rounded-full text-muted hover:bg-muted/50 hover:text-foreground transition-colors"
                aria-label="Đóng thông báo lễ"
                title="Đóng"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** Chip trang chủ */
export function FestivalCountdownChip() {
  const [f, setF] = useState<Festival | null>(null);
  const [days, setDays] = useState(0);

  useEffect(() => {
    const m = getActiveFestivalMood(new Date());
    if (m.festival && m.days <= 14) {
      setF(m.festival);
      setDays(m.days);
    }
  }, []);

  if (!f) return null;
  const label = days === 0 ? "Hôm nay" : days === 1 ? "Ngày mai" : `Còn ${days} ngày`;

  return (
    <Link
      href="/calendar"
      className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-card px-3 py-1.5 text-[11px] font-semibold text-foreground shadow-sm hover:border-primary/40 hover:bg-primary/5 transition-colors"
    >
      <LotusIcon size={16} />
      <span className="text-primary font-bold">{label}</span>
      <span className="text-muted-foreground">·</span>
      <span className="font-serif truncate max-w-[12rem]">{f.name}</span>
    </Link>
  );
}
