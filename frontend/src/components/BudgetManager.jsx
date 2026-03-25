import { useState } from "react";
import { categoryOptions } from "../utils/categories.js";
import { formatMoney, formatMoneyInput, parseMoneyInput } from "../utils/currency.js";

const initialBudget = {
  category: "Ăn uống",
  monthly_limit: "",
  shared_with_family: false,
};

export default function BudgetManager({ budgets, onCreate, onDelete }) {
  const [values, setValues] = useState(initialBudget);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSaving(true);
    try {
      await onCreate({
        ...values,
        monthly_limit: Number(values.monthly_limit),
      });
      setValues(initialBudget);
    } catch (err) {
      setError(err.response?.data?.detail || "Không lưu được ngân sách.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="rounded-[32px] border border-white/70 bg-white/90 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-600">Budget</p>
          <h2 className="mt-2 text-lg font-semibold text-slate-900">Ngân sách theo danh mục</h2>
          <p className="mt-1 text-sm text-slate-500">Đặt trần chi tiêu theo tháng để AI nhắc bạn sớm hơn.</p>
        </div>
        <span className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700">{budgets.length} mục</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 rounded-[28px] bg-slate-50 p-4">
        <label className="space-y-2 text-sm font-medium text-slate-700">
          Danh mục
          <select
            value={values.category}
            onChange={(event) => setValues({ ...values, category: event.target.value })}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-violet-400"
          >
            {categoryOptions.filter((item) => item !== "Thu nhập khác").map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700">
          Hạn mức tháng
          <input
            type="text"
            inputMode="numeric"
            value={formatMoneyInput(values.monthly_limit)}
            onChange={(event) => setValues({ ...values, monthly_limit: parseMoneyInput(event.target.value) })}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-violet-400"
          />
        </label>

        <label className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={values.shared_with_family}
            onChange={(event) => setValues({ ...values, shared_with_family: event.target.checked })}
          />
          Áp dụng chung cho ví gia đình
        </label>

        {error && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
        <button type="submit" className="w-full rounded-full bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-700">
          {isSaving ? "Đang lưu..." : "Thêm ngân sách"}
        </button>
      </form>

      <div className="mt-4 space-y-3">
        {budgets.length === 0 && <EmptyState text="Chưa có ngân sách nào. Hãy tạo một mốc đầu tiên cho tháng này." />}
        {budgets.map((item) => (
          <article key={item.id} className="rounded-[26px] border border-slate-100 bg-slate-50/90 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-slate-900">{item.category}</p>
                <p className="mt-1 text-sm text-slate-500">
                  Đã dùng {formatMoney(item.spent_amount)} / {formatMoney(item.monthly_limit)}
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
              <div
                className={`h-2.5 rounded-full ${item.usage_percent >= 100 ? "bg-rose-500" : "bg-violet-500"}`}
                style={{ width: `${Math.min(item.usage_percent, 100)}%` }}
              />
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
              <span>Còn lại {formatMoney(item.remaining_amount)}</span>
              <span>{Math.round(item.usage_percent)}%</span>
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
