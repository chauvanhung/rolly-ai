/**
 * Approximate Vietnamese lunar calendar helper for UI display.
 * Uses a known reference anchor and day-diff stepping for nearby dates.
 * Not a full astronomical converter — good enough for banner display.
 */

const DAY_MS = 1000 * 60 * 60 * 24;

// Anchor: 2026-07-14 solar ≈ lunar 2026-06-01 (Bính Ngọ)
const ANCHOR_SOLAR = new Date(2026, 6, 14);
const ANCHOR_LUNAR = { day: 1, month: 6, yearLabel: "Bính Ngọ" };

// Rough month lengths around mid-2026 for stepping from the anchor
const MONTH_LENGTHS: Record<number, number> = {
  4: 29,
  5: 30,
  6: 30,
  7: 29,
  8: 30,
  9: 29,
  10: 30,
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function getLunarParts(date: Date = new Date()) {
  const solarMid = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  let diffDays = Math.round((solarMid.getTime() - ANCHOR_SOLAR.getTime()) / DAY_MS);

  let day = ANCHOR_LUNAR.day;
  let month = ANCHOR_LUNAR.month;
  let yearLabel = ANCHOR_LUNAR.yearLabel;

  if (diffDays >= 0) {
    while (diffDays > 0) {
      const len = MONTH_LENGTHS[month] ?? 30;
      const remaining = len - day + 1;
      if (diffDays < remaining) {
        day += diffDays;
        diffDays = 0;
      } else {
        diffDays -= remaining;
        day = 1;
        month += 1;
        if (month > 12) {
          month = 1;
          yearLabel = "Đinh Mùi";
        }
      }
    }
  } else {
    let left = -diffDays;
    while (left > 0) {
      if (day > left) {
        day -= left;
        left = 0;
      } else {
        left -= day;
        month -= 1;
        if (month < 1) {
          month = 12;
          yearLabel = "Ất Tỵ";
        }
        day = MONTH_LENGTHS[month] ?? 30;
      }
    }
  }

  return { day, month, yearLabel };
}

export function getLunarDateString(date: Date = new Date()) {
  const dayNames = [
    "Chủ Nhật",
    "Thứ Hai",
    "Thứ Ba",
    "Thứ Tư",
    "Thứ Năm",
    "Thứ Sáu",
    "Thứ Bảy",
  ];
  const dayName = dayNames[date.getDay()];
  const solar = `${dayName}, ngày ${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  const { day, month, yearLabel } = getLunarParts(date);
  return `Hôm nay: ${solar} (Âm lịch: Ngày ${pad(day)} tháng ${pad(month)}, năm ${yearLabel})`;
}
