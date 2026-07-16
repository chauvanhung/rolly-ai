"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AppContext";
import { login as apiLogin, me } from "@/services/api";
import { Lock, Mail, Loader2, ArrowRight, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const { user, loginUser } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      if (user.is_super_admin || user.role_names?.length > 0) {
        router.push("/admin/dashboard");
      } else {
        router.push("/account");
      }
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await apiLogin(email, password);
      const token = data?.access_token || "";
      let userData = data?.user;
      if (!userData) {
        userData = await me();
      }
      loginUser(token, userData);
      // redirect handled by useEffect when user is set
    } catch (err: any) {
      setError(err.message || "Đăng nhập thất bại. Vui lòng kiểm tra lại tài khoản.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:py-20 fade-in">
      <div className="bg-card border border-border rounded-2xl p-6 sm:p-10 shadow-md space-y-6">
        <div className="text-center space-y-2">
          <span className="text-4xl text-primary select-none" aria-hidden>
            ☸
          </span>
          <h1 className="font-serif text-2xl font-bold text-foreground">Đăng Nhập Đạo Tràng</h1>
          <p className="text-sm text-muted">Chào mừng quý Phật tử quay trở lại không gian tu học.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="login-email" className="text-xs font-bold text-muted uppercase">
              Địa chỉ Email *
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} aria-hidden />
              <input
                id="login-email"
                required
                type="email"
                autoComplete="email"
                placeholder="phattu@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="login-password" className="text-xs font-bold text-muted uppercase">
              Mật khẩu *
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} aria-hidden />
              <input
                id="login-password"
                required
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10"
              />
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="p-3 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/30 rounded-lg text-sm text-center font-medium"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-lg text-sm transition-all hover:bg-primary/95 disabled:opacity-50 flex items-center justify-center space-x-1.5 shadow-sm min-h-12"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                <span>Đang xác thực...</span>
              </>
            ) : (
              <>
                <span>Đăng Nhập</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="text-center text-sm text-muted-foreground border-t border-border/40 pt-4">
          <span>Chưa có tài khoản Phật tử? </span>
          <Link href="/register" className="text-primary font-semibold hover:underline">
            Đăng ký ngay
          </Link>
        </div>

        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-xs text-muted space-y-1">
          <span className="font-bold text-foreground flex items-center">
            <ShieldCheck size={14} className="mr-1 text-primary" aria-hidden />
            <span>Tài khoản demo (local):</span>
          </span>
          <p>
            Email:{" "}
            <span className="font-mono text-foreground font-semibold">admin@phatgiao.rollyhub.com</span>
          </p>
          <p>
            Mật khẩu: <span className="font-mono text-foreground font-semibold">ChangeMe123!</span>
          </p>
        </div>
      </div>
    </div>
  );
}
