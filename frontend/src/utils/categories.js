export const categoryLabels = {
  "An uong": "Ăn uống",
  "Ăn uống": "Ăn uống",
  "Di chuyen": "Di chuyển",
  "Di chuyển": "Di chuyển",
  "Mua sam": "Mua sắm",
  "Mua sắm": "Mua sắm",
  "Hoa don": "Hóa đơn",
  "Hóa đơn": "Hóa đơn",
  "Suc khoe": "Sức khỏe",
  "Sức khỏe": "Sức khỏe",
  "Giao duc": "Giáo dục",
  "Giáo dục": "Giáo dục",
  Luong: "Lương",
  "Lương": "Lương",
  "Chi tieu khac": "Chi tiêu khác",
  "Chi tiêu khác": "Chi tiêu khác",
  "Thu nhap khac": "Thu nhập khác",
  "Thu nhập khác": "Thu nhập khác",
};

export const categoryOptions = [
  "Ăn uống",
  "Di chuyển",
  "Mua sắm",
  "Hóa đơn",
  "Sức khỏe",
  "Giáo dục",
  "Lương",
  "Chi tiêu khác",
  "Thu nhập khác",
];

export function toVietnameseCategory(value) {
  return categoryLabels[value] || value || "";
}
