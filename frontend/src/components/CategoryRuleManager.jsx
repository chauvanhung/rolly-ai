import { useState } from "react";
import { categoryOptions } from "../utils/categories.js";

const initialRule = {
  keyword: "",
  category: "Ăn uống",
  transaction_type: "expense",
  note_template: "",
  is_active: true,
};

export default function CategoryRuleManager({ rules, onCreate, onDelete }) {
  const [values, setValues] = useState(initialRule);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSaving(true);
    try {
      await onCreate(values);
      setValues(initialRule);
    } catch (err) {
      setError(err.response?.data?.detail || "Không lưu được quy tắc.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="rounded-[32px] border border-white/70 bg-white/90 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-600">AI rules</p>
        <h2 className="mt-2 text-lg font-semibold text-slate-900">Quy tắc AI phân loại</h2>
        <p className="mt-1 text-sm text-slate-500">Dạy AI hiểu thói quen riêng như “Grab” là di chuyển hay “Highlands” là ăn uống.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 rounded-[28px] bg-slate-50 p-4">
        <input
          value={values.keyword}
          onChange={(event) => setValues({ ...values, keyword: event.target.value })}
          placeholder="Từ khóa ví dụ: grab, highlands, coopmart"
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-cyan-400"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <select
            value={values.category}
            onChange={(event) => setValues({ ...values, category: event.target.value })}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-cyan-400"
          >
            {categoryOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select
            value={values.transaction_type}
            onChange={(event) => setValues({ ...values, transaction_type: event.target.value })}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-cyan-400"
          >
            <option value="expense">Chi tiêu</option>
            <option value="income">Thu nhập</option>
          </select>
        </div>
        <input
          value={values.note_template}
          onChange={(event) => setValues({ ...values, note_template: event.target.value })}
          placeholder="Ghi chú mẫu nếu muốn"
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-cyan-400"
        />
        {error && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
        <button type="submit" className="w-full rounded-full bg-cyan-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cyan-700">
          {isSaving ? "Đang lưu..." : "Thêm quy tắc"}
        </button>
      </form>

      <div className="mt-4 space-y-3">
        {rules.length === 0 && <EmptyState text="Chưa có quy tắc riêng nào cho AI." />}
        {rules.map((item) => (
          <article key={item.id} className="rounded-[26px] border border-slate-100 bg-slate-50/90 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-slate-900">Nếu có “{item.keyword}”</p>
                <p className="mt-1 text-sm text-slate-500">
                  AI sẽ gán vào {item.category}
                  {item.transaction_type ? ` • ${item.transaction_type === "income" ? "thu nhập" : "chi tiêu"}` : ""}
                </p>
                {item.note_template && <p className="mt-1 text-xs text-slate-400">Ghi chú mẫu: {item.note_template}</p>}
              </div>
              <button
                type="button"
                onClick={() => onDelete(item.id)}
                className="rounded-full bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
              >
                Xóa
              </button>
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
