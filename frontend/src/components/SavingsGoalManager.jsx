import { useState } from "react";
import { formatMoney, formatMoneyInput, parseMoneyInput } from "../utils/currency.js";

const initialGoal = {
  title: "",
  target_amount: "",
  current_amount: "",
  target_date: "",
  is_active: true,
};

export default function SavingsGoalManager({ goals, onCreate, onDelete }) {
  const [values, setValues] = useState(initialGoal);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSaving(true);
    try {
      await onCreate({
        ...values,
        target_amount: Number(values.target_amount),
        current_amount: Number(values.current_amount || 0),
        target_date: values.target_date || null,
      });
      setValues(initialGoal);
    } catch (err) {
      setError(err.response?.data?.detail || "Không lưu được mục tiêu.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="rounded-[32px] border border-white/70 bg-white/90 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-600">Goals</p>
        <h2 className="mt-2 text-lg font-semibold text-slate-900">Mục tiêu tiết kiệm</h2>
        <p className="mt-1 text-sm text-slate-500">Theo dõi các kế hoạch lớn như quỹ dự phòng, du lịch hay học phí.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 rounded-[28px] bg-slate-50 p-4">
        <input
          value={values.title}
          onChange={(event) => setValues({ ...values, title: event.target.value })}
          placeholder="Tên mục tiêu"
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-emerald-400"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            type="text"
            inputMode="numeric"
            value={formatMoneyInput(values.target_amount)}
            onChange={(event) => setValues({ ...values, target_amount: parseMoneyInput(event.target.value) })}
            placeholder="Mục tiêu"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-emerald-400"
          />
          <input
            type="text"
            inputMode="numeric"
            value={formatMoneyInput(values.current_amount)}
            onChange={(event) => setValues({ ...values, current_amount: parseMoneyInput(event.target.value) })}
            placeholder="Hiện có"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-emerald-400"
          />
        </div>
        <input
          type="date"
          value={values.target_date}
          onChange={(event) => setValues({ ...values, target_date: event.target.value })}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-emerald-400"
        />
        {error && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
        <button type="submit" className="w-full rounded-full bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700">
          {isSaving ? "Đang lưu..." : "Thêm mục tiêu"}
        </button>
      </form>

      <div className="mt-4 space-y-3">
        {goals.length === 0 && <EmptyState text="Chưa có mục tiêu tiết kiệm nào." />}
        {goals.map((item) => (
          <article key={item.id} className="rounded-[26px] border border-slate-100 bg-slate-50/90 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-slate-900">{item.title}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {formatMoney(item.current_amount)} / {formatMoney(item.target_amount)}
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
            <div className="mt-3 h-2.5 rounded-full bg-slate-200">
              <div className="h-2.5 rounded-full bg-emerald-500" style={{ width: `${Math.min(item.progress_percent, 100)}%` }} />
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
              <span>{item.target_date ? `Mốc ${new Date(item.target_date).toLocaleDateString("vi-VN")}` : "Chưa đặt hạn"}</span>
              <span>{Math.round(item.progress_percent)}%</span>
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
