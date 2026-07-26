"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AppContext";
import { login as apiLogin, me, getApiUrl } from "@/services/api";
import { Lock, Mail, Loader2, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const { user, loginUser } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [bootstrappingGoogle, setBootstrappingGoogle] = useState(true);

  // Handle OAuth redirect return: token is set as an HttpOnly cookie by the backend; URL only
  // carries `#google=1` (success) or `?google_error=...` (failure).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const search = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(
      window.location.hash.startsWith("#") ? window.location.hash.slice(1) : ""
    );
    const googleErr = search.get("google_error");
    if (googleErr) {
      setError(decodeURIComponent(googleErr));
      setBootstrappingGoogle(false);
      window.history.replaceState({}, "", "/login");
      return;
    }
    // OAuth callback now sets an HttpOnly cookie server-side and returns only `#google=1` — no
    // token in the URL. We just detect the flag and load the session via /auth/me (cookie).
    const fromGoogle = hash.get("google") || search.get("google");
    if (fromGoogle !== "1") {
      setBootstrappingGoogle(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const userData = await me();
        if (cancelled) return;
        loginUser("", userData);
        window.history.replaceState({}, "", "/login");
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Đăng nhập Google thất bại.");
          setBootstrappingGoogle(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loginUser]);

  useEffect(() => {
    if (user) {
      if (user.is_super_admin || (user.role_names?.length ?? 0) > 0) {
        router.push("/admin/dashboard");
      } else {
        router.push("/account");
      }
    }
  }, [user, router]);

  const handleGoogleLogin = async () => {
    setError("");
    setGoogleLoading(true);
    try {
      const returnUrl = `${window.location.origin}/login`;
      const res = await fetch(
        `${getApiUrl()}/auth/google/connect?return_url=${encodeURIComponent(returnUrl)}`,
        { method: "GET", headers: { Accept: "application/json" } }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail = typeof data?.detail === "string" ? data.detail : "Không thể bắt đầu đăng nhập Google.";
        throw new Error(detail);
      }
      if (!data?.auth_url) {
        throw new Error("Server không trả auth_url Google.");
      }
      window.location.assign(data.auth_url);
    } catch (err: unknown) {
      setGoogleLoading(false);
      setError(err instanceof Error ? err.message : "Không thể bắt đầu đăng nhập với Google.");
    }
  };

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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Đăng nhập thất bại. Vui lòng kiểm tra lại tài khoản.");
    } finally {
      setLoading(false);
    }
  };

  if (bootstrappingGoogle && typeof window !== "undefined") {
    const search = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(
      window.location.hash.startsWith("#") ? window.location.hash.slice(1) : ""
    );
    // OAuth callback now returns `#google=1` (token is in the HttpOnly cookie, not the URL).
    if ((hash.get("google") || search.get("google")) === "1") {
      return (
        <div className="mx-auto max-w-md px-4 py-20 text-center text-sm text-muted">
          <Loader2 className="mx-auto mb-3 animate-spin text-primary" size={24} />
          Đang hoàn tất đăng nhập Google...
        </div>
      );
    }
  }

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

        <div className="space-y-3">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading || loading}
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-70 min-h-12"
          >
            {googleLoading ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                <span>Đang chuyển tới Google...</span>
              </>
            ) : (
              <>
                <span className="text-base font-bold text-[#4285F4]">G</span>
                <span>Tiếp tục với Google</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            <span>hoặc đăng nhập bằng email</span>
            <span className="h-px flex-1 bg-border" />
          </div>
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
                placeholder="Tối thiểu 8 ký tự"
                minLength={8}
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
            disabled={loading || googleLoading}
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
          <Link
            href="/register"
            className="inline-flex mt-3 items-center justify-center rounded-lg border border-primary px-4 py-2 text-primary font-bold hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            Đăng ký tài khoản mới
          </Link>
        </div>
      </div>
    </div>
  );
}
