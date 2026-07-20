/**
 * Lễ Phật giáo phổ biến (Việt Nam) + khoảng ngày dương lịch ước lượng theo năm.
 * Dùng cho notify + banner animation khi sắp tới / đúng ngày lễ.
 */

export type Festival = {
  id: string;
  name: string;
  /** Mô tả ngắn */
  description: string;
  /** Ngày dương lịch (local) */
  date: Date;
  /** Biểu tượng trang trí */
  emoji: string;
  /** Mức “trang trọng” cho animation */
  intensity: "soft" | "medium" | "grand";
  /** Nguồn: festival cố định | sự kiện API */
  source: "festival" | "event";
  href?: string;
};

/** Bảng ngày dương lịch các đại lễ chính 2025–2027 (ước lượng VN). */
const FIXED_BY_YEAR: Record<
  number,
  Array<{ id: string; name: string; month: number; day: number; emoji: string; intensity: Festival["intensity"]; description: string }>
> = {
  2025: [
    { id: "tet-2025", name: "Tết Nguyên Đán", month: 1, day: 29, emoji: "🌸", intensity: "grand", description: "Xuân về — kính chúc an lạc." },
    { id: "ram-gieng-2025", name: "Rằm tháng Giêng", month: 2, day: 12, emoji: "🌕", intensity: "medium", description: "Ngày vía Đức Phật Di Lặc." },
    { id: "vesak-2025", name: "Đại lễ Phật Đản (Vesak)", month: 5, day: 12, emoji: "🪷", intensity: "grand", description: "Kỷ niệm Đức Phật đản sinh." },
    { id: "vu-lan-2025", name: "Lễ Vu Lan Báo Hiếu", month: 9, day: 6, emoji: "🌼", intensity: "grand", description: "Mùa hiếu hạnh — tri ân song thân." },
    { id: "trung-thu-2025", name: "Rằm Trung Thu", month: 10, day: 6, emoji: "🥮", intensity: "soft", description: "Rằm tháng Tám — sum vầy." },
    { id: "thanh-dao-2025", name: "Lễ Thành Đạo", month: 1, day: 6, emoji: "✨", intensity: "medium", description: "Đức Phật thành đạo dưới cội Bồ-đề." },
  ],
  2026: [
    { id: "thanh-dao-2026", name: "Lễ Thành Đạo", month: 1, day: 26, emoji: "✨", intensity: "medium", description: "Đức Phật thành đạo dưới cội Bồ-đề." },
    { id: "tet-2026", name: "Tết Nguyên Đán", month: 2, day: 17, emoji: "🌸", intensity: "grand", description: "Xuân Bính Ngọ — kính chúc an lạc." },
    { id: "ram-gieng-2026", name: "Rằm tháng Giêng", month: 3, day: 3, emoji: "🌕", intensity: "medium", description: "Ngày vía Đức Phật Di Lặc." },
    { id: "via-quan-am-2-2026", name: "Vía Quán Thế Âm (tháng 2)", month: 4, day: 6, emoji: "🙏", intensity: "soft", description: "Ngày vía Bồ-tát Quán Thế Âm." },
    { id: "vesak-2026", name: "Đại lễ Phật Đản (Vesak)", month: 5, day: 31, emoji: "🪷", intensity: "grand", description: "Kỷ niệm Đức Phật đản sinh — thắp sáng từ bi." },
    { id: "via-quan-am-6-2026", name: "Vía Quán Thế Âm (tháng 6)", month: 7, day: 31, emoji: "🙏", intensity: "soft", description: "Ngày vía Bồ-tát Quán Thế Âm." },
    { id: "vu-lan-2026", name: "Lễ Vu Lan Báo Hiếu", month: 8, day: 27, emoji: "🌼", intensity: "grand", description: "Mùa hiếu hạnh — tri ân song thân và sư trưởng." },
    { id: "trung-thu-2026", name: "Rằm Trung Thu", month: 9, day: 25, emoji: "🥮", intensity: "soft", description: "Rằm tháng Tám — sum vầy dưới ánh trăng." },
    { id: "via-adi-da-2026", name: "Vía Đức Phật A Di Đà", month: 12, day: 26, emoji: "🔆", intensity: "medium", description: "Ngày vía Đức Phật A Di Đà." },
    { id: "via-quan-am-9-2026", name: "Vía Quán Thế Âm (tháng 9)", month: 10, day: 29, emoji: "🙏", intensity: "soft", description: "Ngày vía Bồ-tát Quán Thế Âm." },
  ],
  2027: [
    { id: "tet-2027", name: "Tết Nguyên Đán", month: 2, day: 6, emoji: "🌸", intensity: "grand", description: "Xuân Đinh Mùi — kính chúc an lạc." },
    { id: "ram-gieng-2027", name: "Rằm tháng Giêng", month: 2, day: 20, emoji: "🌕", intensity: "medium", description: "Ngày vía Đức Phật Di Lặc." },
    { id: "vesak-2027", name: "Đại lễ Phật Đản (Vesak)", month: 5, day: 20, emoji: "🪷", intensity: "grand", description: "Kỷ niệm Đức Phật đản sinh." },
    { id: "vu-lan-2027", name: "Lễ Vu Lan Báo Hiếu", month: 8, day: 16, emoji: "🌼", intensity: "grand", description: "Mùa hiếu hạnh — tri ân song thân." },
    { id: "trung-thu-2027", name: "Rằm Trung Thu", month: 9, day: 15, emoji: "🥮", intensity: "soft", description: "Rằm tháng Tám." },
  ],
};

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysBetween(a: Date, b: Date) {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / (1000 * 60 * 60 * 24));
}

export function getFixedFestivals(year: number): Festival[] {
  const rows = FIXED_BY_YEAR[year] || [];
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    date: new Date(year, r.month - 1, r.day),
    emoji: r.emoji,
    intensity: r.intensity,
    source: "festival" as const,
    href: "/calendar",
  }));
}

/** Lễ trong khoảng [-1, windowDays] so với hôm nay (hôm qua vẫn hiện nhẹ). */
export function getUpcomingFestivals(now = new Date(), windowDays = 21): Festival[] {
  const y = now.getFullYear();
  const all = [...getFixedFestivals(y), ...getFixedFestivals(y + 1)];
  return all
    .map((f) => ({ f, days: daysBetween(now, f.date) }))
    .filter(({ days }) => days >= -1 && days <= windowDays)
    .sort((a, b) => a.days - b.days)
    .map(({ f }) => f);
}

export function getDaysUntil(date: Date, now = new Date()) {
  return daysBetween(now, date);
}

export function formatFestivalDate(date: Date) {
  return date.toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Gần nhất / đang diễn ra — để bật animation */
export function getActiveFestivalMood(now = new Date()): {
  festival: Festival | null;
  days: number;
  active: boolean;
} {
  const upcoming = getUpcomingFestivals(now, 14);
  if (!upcoming.length) return { festival: null, days: 999, active: false };
  const f = upcoming[0];
  const days = getDaysUntil(f.date, now);
  // Animation khi còn ≤ 7 ngày hoặc đúng ngày / hôm qua
  return { festival: f, days, active: days <= 7 };
}

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  href?: string;
  kind: "festival" | "event" | "system";
  emoji?: string;
};

export function festivalsToNotifications(festivals: Festival[], now = new Date()): AppNotification[] {
  return festivals.map((f) => {
    const days = getDaysUntil(f.date, now);
    let body = f.description;
    if (days === 0) body = `Hôm nay là ${f.name}. ${f.description}`;
    else if (days === 1) body = `Ngày mai: ${f.name}. ${f.description}`;
    else if (days > 1) body = `Còn ${days} ngày tới ${f.name} (${formatFestivalDate(f.date)}).`;
    else body = `Vừa qua: ${f.name}.`;
    return {
      id: `fest-${f.id}`,
      title: `${f.emoji} ${f.name}`,
      body,
      createdAt: now.toISOString(),
      href: f.href || "/calendar",
      kind: "festival" as const,
      emoji: f.emoji,
    };
  });
}
