"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { MapPin, Clock, Info, ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "@/services/api";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import { ListSkeleton } from "@/components/ui/Skeleton";

export default function CalendarPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewMonth, setViewMonth] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api("/public/calendar");
      setEvents(data || []);
    } catch (err: any) {
      setError(err?.message || "Không tải được lịch Phật sự.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const formatEventTime = (dateStr: string | null) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const monthLabel = viewMonth.toLocaleDateString("vi-VN", {
    month: "long",
    year: "numeric",
  });

  const eventsInMonth = useMemo(() => {
    return events.filter((evt) => {
      if (!evt.start_at) return true;
      const d = new Date(evt.start_at);
      return d.getFullYear() === viewMonth.getFullYear() && d.getMonth() === viewMonth.getMonth();
    });
  }, [events, viewMonth]);

  const daysWithEvents = useMemo(() => {
    const set = new Set<number>();
    eventsInMonth.forEach((evt) => {
      if (evt.start_at) set.add(new Date(evt.start_at).getDate());
    });
    return set;
  }, [eventsInMonth]);

  const calendarCells = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstDow = new Date(year, month, 1).getDay(); // 0 Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: Array<{ day: number | null }> = [];
    for (let i = 0; i < firstDow; i++) cells.push({ day: null });
    for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d });
    return cells;
  }, [viewMonth]);

  const shiftMonth = (delta: number) => {
    setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 space-y-10 fade-in">
      <PageHeader
        title="Lịch Phật Sự Đạo Tràng"
        description="Theo dõi thời gian biểu lễ Phật, phóng sinh, tu tập định kỳ và các đại lễ Phật giáo trong năm."
      />

      {/* Month navigator */}
      <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="p-2 rounded-full border border-border hover:bg-muted-foreground/10 min-h-11 min-w-11 inline-flex items-center justify-center"
            aria-label="Tháng trước"
          >
            <ChevronLeft size={18} />
          </button>
          <h2 className="font-serif text-lg font-bold text-foreground capitalize">{monthLabel}</h2>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="p-2 rounded-full border border-border hover:bg-muted-foreground/10 min-h-11 min-w-11 inline-flex items-center justify-center"
            aria-label="Tháng sau"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[10px] sm:text-xs font-semibold text-muted-foreground">
          {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {calendarCells.map((cell, idx) => {
            const has = cell.day != null && daysWithEvents.has(cell.day);
            const today = new Date();
            const isToday =
              cell.day != null &&
              today.getDate() === cell.day &&
              today.getMonth() === viewMonth.getMonth() &&
              today.getFullYear() === viewMonth.getFullYear();
            return (
              <div
                key={idx}
                className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs sm:text-sm ${
                  cell.day == null
                    ? ""
                    : has
                    ? "bg-primary/15 text-primary font-bold border border-primary/20"
                    : isToday
                    ? "border border-primary text-foreground font-semibold"
                    : "text-muted bg-background/40"
                }`}
              >
                {cell.day ?? ""}
                {has && <span className="w-1 h-1 rounded-full bg-primary mt-0.5" aria-hidden />}
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-muted-foreground text-center">
          Ô tô đậm = có sự kiện Phật sự trong tháng đang xem
        </p>
      </div>

      {loading ? (
        <ListSkeleton count={3} />
      ) : error ? (
        <EmptyState title="Lỗi tải lịch" description={error} onRetry={loadEvents} />
      ) : eventsInMonth.length === 0 ? (
        <EmptyState
          title="Chưa có sự kiện trong tháng này"
          description="Đạo tràng hiện chưa lên lịch trình Phật sự cho tháng đang xem. Quý Phật tử có thể chuyển tháng hoặc ghé thăm sau."
        />
      ) : (
        <div className="space-y-6">
          {eventsInMonth.map((evt) => (
            <article
              key={evt.id}
              className="bg-card border border-border rounded-xl p-6 shadow-sm hover:border-primary/20 transition-all flex flex-col md:flex-row md:items-center gap-6"
            >
              <div className="md:w-48 shrink-0 bg-primary/5 border border-primary/10 rounded-lg p-4 text-center">
                <span className="text-2xl font-bold text-primary font-mono block">
                  {evt.start_at ? new Date(evt.start_at).getDate() : "—"}
                </span>
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block mt-1">
                  {evt.start_at ? `Tháng ${new Date(evt.start_at).getMonth() + 1}` : "Sắp tới"}
                </span>
              </div>

              <div className="flex-grow space-y-3">
                <h3 className="font-serif text-base font-bold text-foreground">{evt.title}</h3>
                <p className="text-sm text-muted leading-relaxed line-clamp-3">
                  {evt.description || "Tham gia chiêm bái và tu học."}
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted">
                  <span className="flex items-center">
                    <Clock size={14} className="mr-1.5 text-primary shrink-0" aria-hidden />
                    <span>
                      {formatEventTime(evt.start_at)}
                      {evt.end_at ? ` - ${formatEventTime(evt.end_at)}` : ""}
                    </span>
                  </span>
                  <span className="flex items-center">
                    <MapPin size={14} className="mr-1.5 text-primary shrink-0" aria-hidden />
                    <span>{evt.location || "Giảng đường chùa"}</span>
                  </span>
                </div>
              </div>

              <div className="md:w-40 shrink-0 flex flex-col items-stretch md:items-end gap-2">
                {evt.registration_open && (
                  <>
                    <span className="inline-block text-[10px] bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-300 font-bold px-2 py-0.5 rounded border border-green-200 dark:border-green-900/50 text-center">
                      Mở đăng ký
                    </span>
                    <p className="text-[10px] text-muted-foreground">
                      Tối đa: {evt.capacity || "Không giới hạn"}
                    </p>
                    <Link
                      href="/contact"
                      className="text-center text-xs font-bold bg-primary text-primary-foreground px-4 py-2.5 rounded-full hover:bg-primary/95 transition-colors min-h-10 inline-flex items-center justify-center"
                    >
                      Đăng ký tham dự
                    </Link>
                  </>
                )}
                {!evt.registration_open && (
                  <Link
                    href="/contact"
                    className="text-center text-xs font-semibold border border-border px-4 py-2.5 rounded-full hover:border-primary/40 transition-colors min-h-10 inline-flex items-center justify-center"
                  >
                    Hỏi thêm
                  </Link>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <section className="bg-card border border-border rounded-xl p-6 flex items-start space-x-3 text-sm text-muted shadow-sm">
        <Info className="text-primary shrink-0 mt-0.5" size={18} aria-hidden />
        <div className="space-y-1.5">
          <h4 className="font-bold text-foreground font-serif">Kính gửi quý Phật tử đạo tràng</h4>
          <p className="leading-relaxed text-sm">
            Các hoạt động định kỳ như tụng Kinh Pháp Hoa lúc 19h hằng ngày hoặc tụng Kinh Sám Hối tối 14 và 29
            âm lịch được duy trì đều đặn. Các Phật tử đến tham gia vui lòng mặc y phục áo tràng xám/lam, có
            mặt trước giờ hành lễ 15 phút để ổn định đạo tràng.
          </p>
          <Link href="/retreats" className="inline-block text-xs font-bold text-primary hover:underline pt-1">
            Xem khóa tu đang mở →
          </Link>
        </div>
      </section>
    </div>
  );
}
