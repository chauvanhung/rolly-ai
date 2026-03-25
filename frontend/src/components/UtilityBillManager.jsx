import { useState } from "react";
import { formatMoney, formatMoneyInput, parseMoneyInput } from "../utils/currency.js";

const providers = ["EVN", "Nước", "Internet", "Điện thoại", "Chung cư", "Khác"];
const paymentMethods = ["MoMo", "ZaloPay", "Ngân hàng", "Tiền mặt"];

const initialBill = {
  provider: "EVN",
  customer_code: "",
  category: "Hóa đơn",
  preferred_payment_method: "MoMo",
  estimated_amount: "",
  due_day: "10",
  note: "",
  is_active: true,
};

export default function UtilityBillManager({ bills, googleCalendarStatus, onConnectCalendar, onSyncBill, onCreate, onDelete }) {
  const [values, setValues] = useState(initialBill);
  const [isSaving, setIsSaving] = useState(false);
  const [syncingId, setSyncingId] = useState(null);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSaving(true);
    try {
      await onCreate({
        ...values,
        estimated_amount: values.estimated_amount ? Number(values.estimated_amount) : null,
        due_day: Number(values.due_day),
      });
      setValues(initialBill);
    } catch (err) {
      setError(err.response?.data?.detail || "Không lưu được hóa đơn định kỳ.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSync = async (billId) => {
    setSyncingId(billId);
    try {
      await onSyncBill(billId);
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <section className="rounded-[32px] border border-white/70 bg-white/90 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
      <div className="mb-4 space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-fuchsia-600">Bills</p>
          <h2 className="mt-2 text-lg font-semibold text-slate-900">Hóa đơn định kỳ</h2>
          <p className="mt-1 text-sm text-slate-500">Lưu mã khách hàng và đồng bộ lịch nhắc lên Google Calendar của bạn.</p>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Google Calendar</p>
              <p className="mt-1 text-xs text-slate-500">
                {googleCalendarStatus?.connected
                  ? `Đã kết nối${googleCalendarStatus.google_email ? `: ${googleCalendarStatus.google_email}` : ""}`
                  : "Chưa kết nối. Kết nối một lần để đẩy hóa đơn lên lịch điện thoại."}
              </p>
            </div>
            <button
              type="button"
              onClick={onConnectCalendar}
              className="rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              {googleCalendarStatus?.connected ? "Kết nối lại Google" : "Kết nối Google"}
            </button>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 rounded-[28px] bg-slate-50 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <select
            value={values.provider}
            onChange={(event) => setValues({ ...values, provider: event.target.value })}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-fuchsia-400"
          >
            {providers.map((provider) => (
              <option key={provider} value={provider}>
                {provider}
              </option>
            ))}
          </select>
          <input
            value={values.customer_code}
            onChange={(event) => setValues({ ...values, customer_code: event.target.value })}
            placeholder="Mã khách hàng / mã hợp đồng"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-fuchsia-400"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <select
            value={values.preferred_payment_method}
            onChange={(event) => setValues({ ...values, preferred_payment_method: event.target.value })}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-fuchsia-400"
          >
            {paymentMethods.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
          <input
            type="text"
            inputMode="numeric"
            value={formatMoneyInput(values.estimated_amount)}
            onChange={(event) => setValues({ ...values, estimated_amount: parseMoneyInput(event.target.value) })}
            placeholder="Số tiền ước tính"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-fuchsia-400"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <input
            type="number"
            min="1"
            max="31"
            value={values.due_day}
            onChange={(event) => setValues({ ...values, due_day: event.target.value })}
            placeholder="Ngày đến hạn"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-fuchsia-400"
          />
          <input
            value={values.note}
            onChange={(event) => setValues({ ...values, note: event.target.value })}
            placeholder="Ghi chú thêm"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-fuchsia-400"
          />
        </div>

        {error && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
        <button type="submit" className="w-full rounded-full bg-fuchsia-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-fuchsia-700">
          {isSaving ? "Đang lưu..." : "Thêm hóa đơn định kỳ"}
        </button>
      </form>

      <div className="mt-4 space-y-3">
        {bills.length === 0 && <div className="rounded-[24px] bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">Chưa có hóa đơn định kỳ nào.</div>}
        {bills.map((item) => (
          <article key={item.id} className="rounded-[26px] border border-slate-100 bg-slate-50/90 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-slate-900">{item.provider}</p>
                <p className="mt-1 text-sm text-slate-500">
                  Mã {item.customer_code} • {item.preferred_payment_method}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {item.estimated_amount ? formatMoney(item.estimated_amount) : "Chưa có mức ước tính"} • đến hạn ngày {item.due_day}
                </p>
                {item.google_calendar_synced && (
                  <p className="mt-1 text-xs text-emerald-600">
                    Đã sync Google Calendar{item.google_calendar_last_synced_at ? ` • ${new Date(item.google_calendar_last_synced_at).toLocaleDateString("vi-VN")}` : ""}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                <button
                  type="button"
                  onClick={() => onDelete(item.id)}
                  className="rounded-full bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                >
                  Xóa
                </button>
                <button
                  type="button"
                  onClick={() => handleSync(item.id)}
                  disabled={!googleCalendarStatus?.connected || syncingId === item.id}
                  className="rounded-full bg-fuchsia-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-fuchsia-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {syncingId === item.id ? "Đang sync..." : item.google_calendar_synced ? "Sync lại lịch" : "Đồng bộ lịch"}
                </button>
                {item.google_calendar_event_link && (
                  <a
                    href={item.google_calendar_event_link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-semibold text-fuchsia-700 underline"
                  >
                    Mở sự kiện
                  </a>
                )}
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
              <span>Kỳ tới {new Date(item.next_due_date).toLocaleDateString("vi-VN")}</span>
              <span
                className={`rounded-full px-2.5 py-1 ${
                  item.status === "due-soon" ? "bg-amber-100 text-amber-700" : item.status === "inactive" ? "bg-slate-200 text-slate-600" : "bg-fuchsia-100 text-fuchsia-700"
                }`}
              >
                {item.status === "due-soon" ? "Sắp đến hạn" : item.status === "inactive" ? "Đang tắt" : "Đang theo dõi"}
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
