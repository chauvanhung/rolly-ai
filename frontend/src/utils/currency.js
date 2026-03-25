const compactFormatter = new Intl.NumberFormat("vi-VN", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatMoney(value, options = {}) {
  const amount = Number(value || 0);
  const {
    compact = false,
    showSign = false,
    currency = "đ",
  } = options;

  const sign = amount > 0 ? (showSign ? "+" : "") : amount < 0 ? "-" : "";
  const absolute = Math.abs(amount);
  const formatted = compact && absolute >= 1_000_000
    ? compactFormatter.format(absolute)
    : absolute.toLocaleString("vi-VN");

  return `${sign}${formatted} ${currency}`.trim();
}

export function parseMoneyInput(value) {
  const digits = String(value ?? "").replace(/[^\d]/g, "");
  return digits;
}

export function formatMoneyInput(value) {
  const digits = parseMoneyInput(value);
  if (!digits) return "";
  return Number(digits).toLocaleString("vi-VN");
}
