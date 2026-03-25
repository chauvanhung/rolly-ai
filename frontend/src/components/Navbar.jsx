import { useLocation, useNavigate } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("expense_user") || "{}");
  const firstName = (user.full_name || "Bạn").split(" ")[0];
  const isChatPage = location.pathname === "/chat";

  const logout = () => {
    localStorage.removeItem("expense_token");
    localStorage.removeItem("expense_user");
    navigate("/login");
  };

  return (
    <header className="relative overflow-hidden rounded-[32px] bg-slate-950 p-5 text-white shadow-[0_30px_80px_rgba(15,23,42,0.35)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.35),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.25),transparent_30%)]" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">Family Finance</p>
          <h1 className="mt-3 text-2xl font-semibold leading-tight tracking-tight">
            Xin chào {firstName},
            <br />
            {isChatPage ? "mình chat với AI nhé." : "mình xem ví hôm nay nhé."}
          </h1>
          <p className="mt-3 max-w-xs text-sm leading-6 text-slate-300">
            {isChatPage
              ? "Nhắn tự nhiên như đang chat thật, AI sẽ tự ghi giao dịch, hóa đơn và nhắc việc cho bạn."
              : "Ghi chi tiêu thật nhanh, xem xu hướng ngay, và dùng như một app điện thoại mỗi ngày."}
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => navigate(isChatPage ? "/" : "/chat")}
            className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold text-white backdrop-blur transition hover:bg-white/15"
          >
            {isChatPage ? "Về ví" : "Chat AI"}
          </button>
          <button
            onClick={logout}
            className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold text-white backdrop-blur transition hover:bg-white/15"
          >
            Thoát
          </button>
        </div>
      </div>

      <div className="relative mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-[24px] border border-white/10 bg-white/8 px-4 py-3 backdrop-blur">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-300">Mode</p>
          <p className="mt-2 text-sm font-semibold text-white">{isChatPage ? "AI conversation" : "Mobile first"}</p>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-white/8 px-4 py-3 backdrop-blur">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-300">Quick add</p>
          <p className="mt-2 text-sm font-semibold text-white">{isChatPage ? "Chat riêng" : "Bill + chỉnh tay"}</p>
        </div>
      </div>
    </header>
  );
}
