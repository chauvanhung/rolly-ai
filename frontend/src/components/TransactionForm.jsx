import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { categoryOptions } from "../utils/categories.js";
import { formatMoneyInput, parseMoneyInput } from "../utils/currency.js";

const initialForm = {
  type: "expense",
  amount: "",
  category: "",
  note: "",
  created_at: null,
  shared_with_family: false,
};

export default function TransactionForm({ onCreated, onNotify, editingTransaction, onEditingChange }) {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const previewUrl = useMemo(() => receiptPreview, [receiptPreview]);

  useEffect(() => {
    if (!editingTransaction) {
      setForm(initialForm);
      return;
    }
    setForm({
      type: editingTransaction.type,
      amount: editingTransaction.amount,
      category: editingTransaction.category,
      note: editingTransaction.note || "",
      created_at: editingTransaction.created_at || null,
      shared_with_family: Boolean(editingTransaction.family_id),
    });
  }, [editingTransaction]);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSaving(true);
    try {
      const payload = {
        ...form,
        amount: Number(form.amount),
        created_at: form.created_at || null,
      };
      if (editingTransaction) {
        await api.put(`/transactions/${editingTransaction.id}`, payload);
        setMessage("Đã cập nhật giao dịch.");
        onNotify?.({ type: "success", message: "Đã cập nhật giao dịch." });
        onEditingChange?.(null);
      } else {
        await api.post("/transactions", payload);
        setMessage("Đã thêm giao dịch mới.");
        onNotify?.({ type: "success", message: "Đã ghi xong giao dịch mới." });
      }
      setForm(initialForm);
      onCreated();
    } catch (err) {
      const detail = err.response?.data?.detail || "Không lưu được giao dịch.";
      setError(detail);
      onNotify?.({ type: "error", message: detail });
    } finally {
      setIsSaving(false);
    }
  };

  const analyzeReceipt = async () => {
    if (!receiptFile) {
      const detail = "Hãy chọn hoặc chụp ảnh bill trước khi quét.";
      setError(detail);
      onNotify?.({ type: "warning", message: detail });
      return;
    }

    setError("");
    setMessage("");
    setIsScanning(true);

    const body = new FormData();
    body.append("file", receiptFile);

    try {
      const { data } = await api.post("/receipt/analyze", body, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setForm((prev) => ({
        ...prev,
        type: data.transaction_type || prev.type,
        amount: data.amount || prev.amount,
        category: data.category || prev.category,
        note: data.note || prev.note,
        created_at: data.created_at || prev.created_at,
      }));
      setMessage(data.confidence_note);
      onNotify?.({ type: "success", message: "Đã đọc bill và tự điền vào form." });
    } catch (err) {
      const detail = err.response?.data?.detail || "Không quét được bill.";
      setError(detail);
      onNotify?.({ type: "warning", message: detail });
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <section className="space-y-4 rounded-[32px] border border-white/70 bg-white/90 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
      <div className="rounded-[28px] bg-slate-950 p-4 text-white shadow-[0_24px_50px_rgba(15,23,42,0.28)]">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">AI Chat</p>
        <h2 className="mt-2 text-lg font-semibold">Tách riêng thành một màn chat</h2>
        <p className="mt-2 text-sm leading-6 text-slate-300">Bạn muốn nhắn tin đúng nghĩa thì vào màn `Chat AI` riêng. Ở đây mình giữ luồng quét bill và chỉnh tay để thao tác nhanh hơn.</p>
        <button
          type="button"
          onClick={() => navigate("/chat")}
          className="mt-4 rounded-full bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
        >
          Mở Chat AI riêng
        </button>
      </div>

      <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 p-4">
        <p className="text-sm font-medium text-slate-800">Quét bill</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="flex cursor-pointer items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                setReceiptFile(file || null);
                setReceiptPreview(file ? URL.createObjectURL(file) : "");
              }}
            />
            Chụp bill
          </label>

          <label className="flex cursor-pointer items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                setReceiptFile(file || null);
                setReceiptPreview(file ? URL.createObjectURL(file) : "");
              }}
            />
            Chọn từ máy
          </label>
        </div>

        <div className="mt-3 flex min-h-[180px] items-center justify-center rounded-[24px] border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-500">
          {previewUrl ? <img src={previewUrl} alt="Bill preview" className="max-h-52 rounded-2xl object-contain" /> : "Chạm để chọn hoặc chụp ảnh bill"}
        </div>
        <button
          type="button"
          onClick={analyzeReceipt}
          className="mt-3 w-full rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          {isScanning ? "Đang quét nhanh..." : "Quét bill"}
        </button>
      </div>

      <form onSubmit={submit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-2 text-sm font-medium text-slate-700">
            Số tiền
            <input
              type="text"
              inputMode="numeric"
              value={formatMoneyInput(form.amount)}
              onChange={(e) => setForm({ ...form, amount: parseMoneyInput(e.target.value) })}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-400"
            />
          </label>

          <label className="space-y-2 text-sm font-medium text-slate-700">
            Loại giao dịch
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-400"
            >
              <option value="expense">Chi tiêu</option>
              <option value="income">Thu nhập</option>
            </select>
          </label>
        </div>

        <label className="space-y-2 text-sm font-medium text-slate-700">
          Danh mục
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-400"
          >
            <option value="">Chọn danh mục</option>
            {categoryOptions.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700">
          Ghi chú
          <textarea
            rows={3}
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-400"
          />
        </label>

        <label className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={form.shared_with_family}
            onChange={(event) => setForm({ ...form, shared_with_family: event.target.checked })}
          />
          Chia sẻ vào ví gia đình
        </label>

        {message && <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>}
        {error && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="submit" className="flex-1 rounded-full bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600">
            {isSaving ? "Đang lưu..." : editingTransaction ? "Cập nhật giao dịch" : "Lưu giao dịch"}
          </button>
          {editingTransaction && (
            <button
              type="button"
              onClick={() => onEditingChange?.(null)}
              className="rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Hủy sửa
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
