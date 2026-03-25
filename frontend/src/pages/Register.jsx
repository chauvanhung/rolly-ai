import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    family_name: "",
    family_invite_code: ""
  });
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      const payload = { ...form };
      if (!payload.family_name) delete payload.family_name;
      if (!payload.family_invite_code) delete payload.family_invite_code;
      const { data } = await api.post("/auth/register", payload);
      localStorage.setItem("expense_token", data.access_token);
      localStorage.setItem("expense_user", JSON.stringify(data.user));
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.detail || "Đăng ký thất bại.");
    }
  };

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[32px] bg-gradient-to-br from-emerald-500 to-cyan-500 p-8 text-slate-950 shadow-[0_24px_60px_rgba(16,185,129,0.25)]">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-900/70">Family Finance</p>
          <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight">Tạo tài khoản mới và bắt đầu ghi chi tiêu theo cách đơn giản hơn.</h1>
          <p className="mt-4 text-base leading-7 text-slate-900/75">
            Bạn có thể dùng riêng cá nhân hoặc mở ví gia đình ngay từ lúc đăng ký.
          </p>
        </section>

        <form onSubmit={handleSubmit} className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur">
          <h2 className="text-2xl font-semibold text-slate-900">Đăng ký</h2>
          <p className="mt-2 text-sm text-slate-500">Tạo tài khoản để vào màn hình quản lý tài chính.</p>

          <div className="mt-6 space-y-4">
            <input placeholder="Họ và tên" onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-400" />
            <input placeholder="Email" type="email" onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-400" />
            <input placeholder="Mật khẩu" type="password" onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-400" />
            <input placeholder="Tên gia đình (tùy chọn)" onChange={(e) => setForm({ ...form, family_name: e.target.value })} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-400" />
            <input placeholder="Mã gia đình (tùy chọn)" onChange={(e) => setForm({ ...form, family_invite_code: e.target.value })} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-400" />
            {error && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
            <button className="w-full rounded-full bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600">
              Tạo tài khoản
            </button>
          </div>

          <p className="mt-4 text-sm text-slate-500">
            Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
