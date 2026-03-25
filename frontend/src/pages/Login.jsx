import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      const { data } = await api.post("/auth/login", form);
      localStorage.setItem("expense_token", data.access_token);
      localStorage.setItem("expense_user", JSON.stringify(data.user));
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.detail || "Đăng nhập thất bại.");
    }
  };

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[32px] bg-slate-900 p-8 text-white shadow-[0_24px_60px_rgba(15,23,42,0.2)]">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">Family Finance</p>
          <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight">Ứng dụng chi tiêu kiểu fintech, đủ nhẹ để cả nhà cùng dùng.</h1>
          <p className="mt-4 text-base leading-7 text-slate-300">
            Mọi thứ gói trong một màn hình: tổng quan thu chi, biểu đồ, thêm giao dịch nhanh, bill scan và AI ghi chi tiêu.
          </p>
        </section>

        <form onSubmit={handleSubmit} className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur">
          <h2 className="text-2xl font-semibold text-slate-900">Đăng nhập</h2>
          <p className="mt-2 text-sm text-slate-500">Tiếp tục với tài khoản của bạn.</p>

          <div className="mt-6 space-y-4">
            <input
              placeholder="Email"
              type="email"
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-400"
            />
            <input
              placeholder="Mật khẩu"
              type="password"
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-400"
            />
            {error && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
            <button className="w-full rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
              Vào ứng dụng
            </button>
          </div>

          <p className="mt-4 text-sm text-slate-500">
            Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
