"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bell, CalendarHeart } from "lucide-react";
import {
  formatFestivalDate,
  getFixedFestivals,
  getDaysUntil,
  type Festival,
} from "@/lib/buddhistFestivals";
import FestivalAtmosphere from "@/components/FestivalAtmosphere";
import { LotusIcon } from "@/components/festival/LotusSvg";

type PreviewMode = "upcoming" | "today" | "tomorrow" | "grand";

/**
 * Demo full: banner + hoa sen bay + pháp luân + Phật mờ (đại lễ).
 * /demo/festival
 */
export default function FestivalDemoPage() {
  const [mode, setMode] = useState<PreviewMode>("grand");

  const sample = useMemo(() => {
    const year = new Date().getFullYear();
    const list = getFixedFestivals(year);
    const vesak = list.find((f) => f.id.includes("vesak")) || list[0];
    const vuLan = list.find((f) => f.id.includes("vu-lan")) || list[1] || list[0];
    const soft = list.find((f) => f.intensity === "soft") || list[list.length - 1];

    if (mode === "today") {
      return {
        festival: { ...vesak, date: new Date(), intensity: "grand" as const },
        days: 0,
        label: "Hôm nay",
      };
    }
    if (mode === "tomorrow") {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      return { festival: { ...soft, date: d }, days: 1, label: "Ngày mai" };
    }
    if (mode === "grand") {
      const d = new Date();
      d.setDate(d.getDate() + 2);
      return {
        festival: { ...vuLan, date: d, intensity: "grand" as const },
        days: 2,
        label: "Còn 2 ngày",
      };
    }
    const d = new Date();
    d.setDate(d.getDate() + 11);
    return { festival: { ...soft, date: d, intensity: "soft" as const }, days: 11, label: "Còn 11 ngày" };
  }, [mode]);

  const forceMood = {
    festival: sample.festival as Festival,
    days: sample.days,
    active: true,
  };

  // Ambient khi ≤ 7 ngày (hoặc luôn bật cho demo grand/today/tomorrow)
  const showAmbient = sample.days <= 7;

  const notifyItems = useMemo(() => {
    const year = new Date().getFullYear();
    return getFixedFestivals(year)
      .map((fest) => ({ fest, days: getDaysUntil(fest.date) }))
      .filter(({ days }) => days >= -1 && days <= 45)
      .sort((a, b) => a.days - b.days)
      .slice(0, 6);
  }, []);

  return (
    <div className="min-h-screen bg-background relative">
      {/* Full production-like stack */}
      <FestivalAtmosphere forceMood={forceMood} forceShowAmbient={showAmbient || mode === "grand"} />

      {/* Spacer so content not under fixed ambient visuals only */}
      <div className="relative z-[46]">
        {/* Fake navbar strip for context */}
        <div className="border-b border-border bg-card/90 backdrop-blur-md px-4 h-14 flex items-center justify-between max-w-7xl mx-auto w-full">
          <span className="font-serif font-bold text-foreground flex items-center gap-2">
            <span className="text-primary">☸</span> Dharma Hub
          </span>
          <span className="text-xs text-muted flex items-center gap-2">
            <Bell size={16} className="text-primary" /> Demo UI
          </span>
        </div>

        <div className="mx-auto max-w-3xl px-4 py-10 space-y-8">
          <div className="space-y-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-foreground"
            >
              <ArrowLeft size={14} /> Về trang chủ
            </Link>
            <h1 className="font-serif text-2xl font-bold text-foreground flex items-center gap-2">
              <LotusIcon size={32} />
              Demo: Hoa sen · Phật · Pháp luân
            </h1>
            <p className="text-sm text-muted leading-relaxed">
              Animation trang nhã: <strong>cánh sen SVG</strong> bay nhẹ, <strong>pháp luân</strong> quay chậm,{" "}
              <strong>hào quang</strong> vàng, đại lễ thêm <strong>hình Phật mờ</strong>. Không dùng emoji rơi.
            </p>
          </div>

          <section className="rounded-2xl border border-border bg-card/90 backdrop-blur-sm p-5 space-y-3 shadow-sm">
            <h2 className="text-sm font-bold text-foreground">Chế độ xem trước</h2>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { key: "upcoming" as const, label: "Còn ~11 ngày (ít cánh sen)" },
                  { key: "tomorrow" as const, label: "Ngày mai" },
                  { key: "grand" as const, label: "Đại lễ · 2 ngày (đủ hiệu ứng)" },
                  { key: "today" as const, label: "Đúng ngày Phật Đản" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setMode(opt.key)}
                  className={`rounded-full px-3 py-2 text-[11px] font-bold border transition-colors ${
                    mode === opt.key
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted">
              Đang xem: <strong className="text-foreground">{sample.label}</strong> — {sample.festival.name}
              {showAmbient ? " · có ambient hoa sen" : " · chỉ banner (ambient khi ≤ 7 ngày)"}
            </p>
          </section>

          <section className="rounded-2xl border border-border bg-card/90 p-5 space-y-3 shadow-sm">
            <h2 className="text-sm font-bold text-foreground">Chip trang chủ</h2>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-card px-3 py-1.5 text-[11px] font-semibold shadow-sm">
              <LotusIcon size={16} />
              <span className="text-primary font-bold">{sample.label}</span>
              <span className="text-muted-foreground">·</span>
              <span className="font-serif">{sample.festival.name}</span>
            </span>
          </section>

          <section className="rounded-2xl border border-border bg-card/90 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-primary/5">
              <Bell size={16} className="text-primary" />
              <div>
                <p className="text-sm font-bold">Thông báo (mẫu)</p>
                <p className="text-[10px] text-muted">Lễ sắp tới</p>
              </div>
            </div>
            <ul className="divide-y divide-border max-h-64 overflow-y-auto">
              {notifyItems.map(({ fest, days }) => {
                const when =
                  days === 0 ? "Hôm nay" : days === 1 ? "Ngày mai" : days < 0 ? "Vừa qua" : `Còn ${days} ngày`;
                return (
                  <li key={fest.id} className="px-4 py-3">
                    <p className="text-xs font-bold flex items-center gap-1.5">
                      <LotusIcon size={14} /> {fest.name}
                    </p>
                    <p className="text-[11px] text-muted mt-0.5">
                      {when} · {formatFestivalDate(fest.date)}
                    </p>
                  </li>
                );
              })}
            </ul>
          </section>

          <div className="rounded-xl border border-dashed border-border p-4 text-[11px] text-muted space-y-2 bg-card/60">
            <p>
              <strong className="text-foreground">Link demo:</strong>{" "}
              <code className="text-primary font-mono bg-primary/5 px-1 rounded">/demo/festival</code>
            </p>
            <p>Trên site thật: ambient bật khi còn ≤ 7 ngày tới lễ; banner ≤ 14 ngày.</p>
            <Link
              href="/calendar"
              className="inline-flex items-center gap-1 font-bold text-primary hover:underline"
            >
              <CalendarHeart size={14} /> Lịch Phật sự
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
