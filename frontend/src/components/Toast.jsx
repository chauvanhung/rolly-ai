export default function Toast({ toast, onClose }) {
  if (!toast) return null;

  const tone =
    toast.type === "error"
      ? "bg-rose-600 text-white"
      : toast.type === "warning"
        ? "bg-amber-500 text-slate-950"
        : "bg-emerald-500 text-white";

  return (
    <div className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <div className={`flex w-full max-w-md items-center justify-between gap-3 rounded-full px-4 py-3 shadow-2xl ${tone}`}>
        <span className="text-sm font-medium">{toast.message}</span>
        <button onClick={onClose} className="rounded-full bg-black/10 px-3 py-1 text-xs font-semibold">
          Đóng
        </button>
      </div>
    </div>
  );
}
