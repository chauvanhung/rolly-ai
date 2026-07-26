"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { register as apiRegister, me, getApiUrl } from "@/services/api";
import { useAuth } from "@/context/AppContext";
import { User, Lock, Mail, Phone, Loader2, CheckCircle2 } from "lucide-react";

/**
 * Đăng ký email + Google OAuth redirect (cùng flow với /login).
 * Không dùng GIS button (tránh lỗi "origin not registered").
 */
export default function RegisterPage() {
  const router = useRouter();
  const { user, loginUser } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [bootstrappingGoogle, setBootstrappingGoogle] = useState(true);

  // OAuth return: backend sets an HttpOnly cookie and redirects with `#google=1` (no token in URL).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const search = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(
      window.location.hash.startsWith("#") ? window.location.hash.slice(1) : ""
    );
    const fromGoogle = hash.get("google") || search.get("google");
    const googleErr = search.get("google_error");
    if (googleErr) {
      setError(decodeURIComponent(googleErr));
      setBootstrappingGoogle(false);
      window.history.replaceState({}, "", "/register");
      return;
    }
    // OAuth callback sets an HttpOnly cookie and returns only `#google=1` (no token in URL).
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
        window.history.replaceState({}, "", "/register");
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Đăng ký/đăng nhập Google thất bại.");
          setBootstrappingGoogle(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loginUser]);

  useEffect(() => {
    if (!user) return;
    if (user.is_super_admin || (user.role_names?.length ?? 0) > 0) {
      router.push("/admin/dashboard");
    } else {
      router.push("/account");
    }
  }, [user, router]);

  const handleGoogle = async () => {
    setError("");
    setGoogleLoading(true);
    try {
      // Về lại /register để nhận token (hoặc /login cũng được — dùng /register cho UX đăng ký)
      const returnUrl = `${window.location.origin}/register`;
      const res = await fetch(
        `${getApiUrl()}/auth/google/connect?return_url=${encodeURIComponent(returnUrl)}`,
        { method: "GET", headers: { Accept: "application/json" } }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail =
          typeof data?.detail === "string" ? data.detail : "Không thể bắt đầu đăng ký Google.";
        throw new Error(detail);
      }
      if (!data?.auth_url) throw new Error("Server không trả auth_url Google.");
      window.location.assign(data.auth_url);
    } catch (err: unknown) {
      setGoogleLoading(false);
      setError(err instanceof Error ? err.message : "Không thể bắt đầu đăng ký với Google.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await apiRegister(email, password, fullName, phone || undefined);
      setSuccess(true);
      window.setTimeout(() => router.push("/login"), 2500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Đăng ký thất bại. Email có thể đã tồn tại.");
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
          Đang hoàn tất đăng ký Google...
        </div>
      );
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 fade-in">
      <div className="bg-card border border-border rounded-2xl p-6 sm:p-10 shadow-md space-y-6">
        <div className="text-center space-y-2">
          <span className="text-4xl text-primary select-none" aria-hidden>
            ☸
          </span>
          <h2 className="font-serif text-2xl font-bold text-foreground">Đăng Ký Tài Khoản</h2>
          <p className="text-xs text-muted">
            Trở thành thành viên để lưu trữ kinh văn và cập nhật thời khóa tu học.
          </p>
        </div>

        {success ? (
          <div className="text-center py-10 space-y-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/40 rounded-xl p-4">
            <CheckCircle2 size={44} className="text-green-500 mx-auto" />
            <h4 className="font-bold text-foreground text-sm">Đăng ký thành công!</h4>
            <p className="text-xs text-muted leading-relaxed">
              Tài khoản đã được tạo. Đang chuyển sang trang đăng nhập...
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => void handleGoogle()}
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
                    <span>Đăng ký / đăng nhập với Google</span>
                  </>
                )}
              </button>
              <p className="text-[10px] text-center text-muted">
                Google sẽ tạo tài khoản nếu email chưa có, hoặc đăng nhập nếu đã có.
              </p>

              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                <span>hoặc đăng ký bằng email</span>
                <span className="h-px flex-1 bg-border" />
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-muted uppercase">Họ và tên Phật tử *</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 text-muted-foreground" size={14} />
                  <input
                    required
                    type="text"
                    placeholder="Nguyễn Văn A"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full text-xs pl-10 py-2.5"
                    minLength={2}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-muted uppercase">Địa chỉ Email *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 text-muted-foreground" size={14} />
                  <input
                    required
                    type="email"
                    placeholder="phattu@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-xs pl-10 py-2.5"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-muted uppercase">Số điện thoại</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 text-muted-foreground" size={14} />
                  <input
                    type="tel"
                    placeholder="0901234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full text-xs pl-10 py-2.5"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-muted uppercase">Mật khẩu *</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 text-muted-foreground" size={14} />
                  <input
                    required
                    type="password"
                    placeholder="•••••••• (Tối thiểu 8 ký tự)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full text-xs pl-10 py-2.5"
                    minLength={8}
                    autoComplete="new-password"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/30 rounded-lg text-xs text-center font-medium">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || googleLoading}
                className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-md text-xs transition-all hover:bg-primary/95 disabled:opacity-50 flex items-center justify-center space-x-1.5 shadow-sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={14} />
                    <span>Đang xử lý hồ sơ...</span>
                  </>
                ) : (
                  <span>Tạo Tài Khoản</span>
                )}
              </button>
            </form>
          </>
        )}

        <div className="text-center text-xs text-muted pt-2 border-t border-border">
          Đã có tài khoản Phật tử?{" "}
          <Link href="/login" className="font-bold text-primary hover:underline">
            Đăng nhập ngay
          </Link>
        </div>
      </div>
    </div>
  );
}
