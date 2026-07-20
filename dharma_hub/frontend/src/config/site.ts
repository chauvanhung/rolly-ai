/**
 * Thông tin đạo tràng — điền vào đây để hiển thị trên toàn site.
 * Để trống ("") thì UI sẽ hiện "Đang cập nhật".
 */
export const siteConfig = {
  /** Tên chùa / đạo tràng (ví dụ: "Chùa ...") */
  templeName: "",

  /** Địa chỉ đầy đủ */
  address: "",

  /** Số điện thoại hiển thị */
  phone: "",

  /** Tel link, ví dụ: "+84..." — có thể để trống nếu chưa có */
  phoneTel: "",

  /** Email liên hệ */
  email: "",

  /** Giờ mở cửa */
  openHours: "",

  /**
   * URL embed Google Maps (iframe src).
   * Lấy từ Google Maps → Chia sẻ → Nhúng bản đồ.
   */
  mapEmbedUrl: "",

  /**
   * Link mở Google Maps (nút "Mở bản đồ").
   * Ví dụ: "https://maps.google.com/?q=..."
   */
  mapLinkUrl: "",
} as const;

export function displayOrPlaceholder(value: string, placeholder = "Đang cập nhật") {
  const v = (value || "").trim();
  return v || placeholder;
}
