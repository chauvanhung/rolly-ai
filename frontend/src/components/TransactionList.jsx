import { categoryOptions, toVietnameseCategory } from "../utils/categories.js";
import { formatMoney } from "../utils/currency.js";

const categoryBadge = {
  "Ăn uống": "🍜",
  "Di chuyển": "🛵",
  "Mua sắm": "🛍️",
  "Hóa đơn": "🧾",
  "Sức khỏe": "💊",
  "Giáo dục": "📚",
  "Lương": "💼",
  "Chi tiêu khác": "✨",
  "Thu nhập khác": "💸",
};

export default function TransactionList({ transactions, filters, onFiltersChange, onDelete, onEdit }) {
  return (
    <section className="rounded-[32px] border border-white/70 bg-white/90 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-600">Activity</p>
          <h2 className="mt-2 text-lg font-semibold text-slate-900">Nhật ký giao dịch</h2>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">{transactions.length} mục</span>
      </div>

      <div className="mb-4 grid gap-3 rounded-[28px] bg-slate-50 p-4 sm:grid-cols-2 xl:grid-cols-4">
        <input
          value={filters.search}
          onChange={(event) => onFiltersChange({ ...filters, search: event.target.value })}
          placeholder="Tìm ghi chú hoặc danh mục"
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-400"
        />
        <select
          value={filters.type}
          onChange={(event) => onFiltersChange({ ...filters, type: event.target.value })}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-400"
        >
          <option value="">Tất cả loại</option>
          <option value="expense">Chi tiêu</option>
          <option value="income">Thu nhập</option>
        </select>
        <select
          value={filters.category}
          onChange={(event) => onFiltersChange({ ...filters, category: event.target.value })}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-400"
        >
          <option value="">Tất cả danh mục</option>
          {categoryOptions.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => onFiltersChange({ search: "", type: "", category: "" })}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          Xóa bộ lọc
        </button>
      </div>

      <div className="space-y-3">
        {transactions.length === 0 && (
          <div className="rounded-[24px] bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">Chưa có giao dịch nào.</div>
        )}

        {transactions.map((item) => {
          const category = toVietnameseCategory(item.category);
          const signedAmount = item.type === "income" ? Number(item.amount) : -Math.abs(Number(item.amount));

          return (
            <article key={item.id} className="rounded-[26px] border border-slate-100 bg-slate-50/90 p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-[20px] bg-gradient-to-br from-cyan-500 to-emerald-500 text-xl text-white shadow-lg">
                  {categoryBadge[category] || "💡"}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-slate-900">{category}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-500">{item.note || "Không có ghi chú"}</p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className={`text-base font-semibold ${item.type === "income" ? "text-emerald-600" : "text-rose-600"}`}>
                        {formatMoney(signedAmount, { showSign: true })}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {new Date(item.created_at).toLocaleDateString("vi-VN", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-500 shadow-sm">
                      {item.type === "income" ? "Thu nhập" : "Chi tiêu"}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onEdit(item)}
                        className="rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(item.id)}
                        className="rounded-full bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
