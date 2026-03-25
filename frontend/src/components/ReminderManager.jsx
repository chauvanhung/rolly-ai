import { useState } from "react";
import { categoryOptions } from "../utils/categories.js";
import { formatMoney, formatMoneyInput, parseMoneyInput } from "../utils/currency.js";

const initialReminder = {
  title: "",
  category: "Hóa đơn",
  amount: "",
  due_date: "",
  recurrence: "monthly",
  note: "",
};

export default function ReminderManager({ reminders, onCreate, onDelete }) {
  const [values, setValues] = useState(initialReminder);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSaving(true);
    try {
      await onCreate({
        ...values,
        amount: values.amount ? Number(values.amount) : null,
      });
      setValues(initialReminder);
    } catch (err) {
      setError(err.response?.data?.detail || "Không lưu được nhắc việc.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="rounded-[32px] border border-white/70 bg-white/90 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-600">Reminders</p>
        <h2 className="mt-2 text-lg font-semibold text-slate-900">Nhắc thanh toán</h2>
        <p className="mt-1 text-sm text-slate-500">Giữ nhịp cho điện, nước, học phí và các khoản lặp lại mỗi tháng.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 rounded-[28px] bg-slate-50 p-4">
        <input
          value={values.title}
          onChange={(event) => setValues({ ...values, title: event.target.value })}
          placeholder="Ví dụ: Tiền điện tháng này"
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-amber-400"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <select
            value={values.category}
            onChange={(event) => setValues({ ...values, category: event.target.value })}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-amber-400"
          >
            {categoryOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <input
            type="text"
            inputMode="numeric"
            value={formatMoneyInput(values.amount)}
            onChange={(event) => setValues({ ...values, amount: parseMoneyInput(event.target.value) })}
            placeholder="Số tiền dự kiến"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-amber-400"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            type="date"
            value={values.due_date}
            onChange={(event) => setValues({ ...values, due_date: event.target.value })}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-amber-400"
          />
          <select
            value={values.recurrence}
            onChange={(event) => setValues({ ...values, recurrence: event.target.value })}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-amber-400"
          >
            <option value="once">Một lần</option>
            <option value="weekly">Hàng tuần</option>
            <option value="monthly">Hàng tháng</option>
            <option value="yearly">Hàng năm</option>
          </select>
        </div>
        <textarea
          rows={2}
          value={values.note}
          onChange={(event) => setValues({ ...values, note: event.target.value })}
          placeholder="Ghi chú thêm"
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-amber-400"
        />
        {error && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
        <button type="submit" className="w-full rounded-full bg-amber-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-amber-600">
          {isSaving ? "Đang lưu..." : "Tạo nhắc việc"}
        </button>
      </form>

      <div className="mt-4 space-y-3">
        {reminders.length === 0 && <EmptyState text="Chưa có lời nhắc nào." />}
        {reminders.map((item) => (
          <article key={item.id} className="rounded-[26px] border border-slate-100 bg-slate-50/90 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-slate-900">{item.title}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {item.category || "Nhắc việc"} {item.amount ? `• ${formatMoney(item.amount)}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onDelete(item.id)}
                className="rounded-full bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
              >
                Xóa
              </button>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
              <span>Đến hạn {new Date(item.due_date).toLocaleDateString("vi-VN")}</span>
              <span
                className={`rounded-full px-2.5 py-1 ${
                  item.status === "overdue" ? "bg-rose-100 text-rose-700" : item.status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                }`}
              >
                {item.status === "overdue" ? "Quá hạn" : item.status === "completed" ? "Đã xong" : "Sắp tới"}
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function EmptyState({ text }) {
  return <div className="rounded-[24px] bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">{text}</div>;
}
