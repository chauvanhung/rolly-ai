
"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { register as apiRegister, googleLogin as apiGoogleLogin, me } from "@/services/api";
import { useAuth } from "@/context/AppContext";
import { User, Lock, Mail, Phone, Loader2, CheckCircle2 } from "lucide-react";

const T = {
  wheel: "\u2638",
  title: "\u0110\u0103ng K\u00fd T\u00e0i Kho\u1ea3n",
  subtitle: "Tr\u1edf th\u00e0nh th\u00e0nh vi\u00ean \u0111\u1ec3 l\u01b0u tr\u1eef kinh v\u0103n v\u00e0 c\u1eadp nh\u1eadt th\u1eddi kh\u00f3a tu h\u1ecdc.",
  googleLabel: "\u0110\u0103ng k\u00fd nhanh v\u1edbi Google",
  googleUnavailable: "Google ch\u01b0a kh\u1ea3 d\u1ee5ng",
  googleFail: "\u0110\u0103ng k\u00fd/\u0111\u0103ng nh\u1eadp Google th\u1ea5t b\u1ea1i. Vui l\u00f2ng th\u1eed l\u1ea1i.",
  googleScriptFail: "Kh\u00f4ng t\u1ea3i \u0111\u01b0\u1ee3c Google Login script. Vui l\u00f2ng ki\u1ec3m tra m\u1ea1ng ho\u1eb7c c\u1ea5u h\u00ecnh CSP/domain.",
  googleNotConfigured: "Ch\u01b0a c\u1ea5u h\u00ecnh Google Login. Th\u00eam",
  currentOrigin: "Origin hi\u1ec7n t\u1ea1i",
  divider: "ho\u1eb7c \u0111\u0103ng k\u00fd b\u1eb1ng email",
  fullName: "H\u1ecd v\u00e0 t\u00ean Ph\u1eadt t\u1eed *",
  fullNamePlaceholder: "Nguy\u1ec5n V\u0103n A",
  email: "\u0110\u1ecba ch\u1ec9 Email *",
  phone: "S\u1ed1 \u0111i\u1ec7n tho\u1ea1i",
  password: "M\u1eadt kh\u1ea9u *",
  passwordPlaceholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022 (T\u1ed1i thi\u1ec3u 8 k\u00fd t\u1ef1)",
  submit: "T\u1ea1o T\u00e0i Kho\u1ea3n",
  processing: "\u0110ang x\u1eed l\u00fd h\u1ed3 s\u01a1...",
  successTitle: "\u0110\u0103ng k\u00fd th\u00e0nh c\u00f4ng!",
  successText: "T\u00e0i kho\u1ea3n Ph\u1eadt t\u1eed c\u1ee7a b\u1ea1n \u0111\u00e3 \u0111\u01b0\u1ee3c kh\u1edfi t\u1ea1o. \u0110ang chuy\u1ec3n h\u01b0\u1edbng sang trang \u0111\u0103ng nh\u1eadp trong gi\u00e2y l\u00e1t...",
  fail: "\u0110\u0103ng k\u00fd th\u1ea5t b\u1ea1i. Email c\u00f3 th\u1ec3 \u0111\u00e3 t\u1ed3n t\u1ea1i.",
  haveAccount: "\u0110\u00e3 c\u00f3 t\u00e0i kho\u1ea3n Ph\u1eadt t\u1eed? ",
  loginNow: "\u0110\u0103ng nh\u1eadp ngay",
} as const;

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
          }) => void;
          renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

export default function RegisterPage() {
  const router = useRouter();
  const { loginUser } = useAuth();
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [googleError, setGoogleError] = useState("");
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (!googleClientId || !googleButtonRef.current) return;

    let cancelled = false;
    let pollTimer: number | undefined;

    const blockedMessage = () => {
      const currentOrigin = window.location.origin;
      return `Google Login \u0111\u00e3 \u0111\u01b0\u1ee3c c\u1ea5u h\u00ecnh nh\u01b0ng Google \u0111ang ch\u1eb7n origin ${currentOrigin} cho Client ID n\u00e0y. H\u00e3y th\u00eam ${currentOrigin} v\u00e0o Google Cloud Console > OAuth Client > Authorized JavaScript origins. V\u1edbi production c\u1ea7n th\u00eam https://phatgiao.rollyhub.com.`;
    };

    const verifyGoogleButtonVisible = () => {
      let attempts = 0;
      window.clearInterval(pollTimer);
      pollTimer = window.setInterval(() => {
        if (cancelled) {
          window.clearInterval(pollTimer);
          return;
        }
        attempts += 1;
        const iframe = googleButtonRef.current?.querySelector("iframe");
        const rect = iframe?.getBoundingClientRect();
        if (rect && rect.width > 20 && rect.height > 20) {
          setGoogleError("");
          window.clearInterval(pollTimer);
          return;
        }
        if (attempts >= 6) {
          setGoogleError(blockedMessage());
          window.clearInterval(pollTimer);
        }
      }, 500);
    };

    const handleCredential = async (response: { credential?: string }) => {
      if (!response.credential) return;
      setError("");
      setGoogleError("");
      setLoading(true);
      try {
        const data = await apiGoogleLogin(response.credential);
        const token = data?.access_token || "";
        const userData = await me();
        loginUser(token, userData);
        router.push(userData?.is_super_admin || (userData?.role_names?.length ?? 0) > 0 ? "/admin/dashboard" : "/account");
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : T.googleFail;
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    const renderGoogleButton = () => {
      if (cancelled || !googleButtonRef.current || !window.google?.accounts?.id) return;
      try {
        googleButtonRef.current.innerHTML = "";
        setGoogleError("");
        window.google.accounts.id.initialize({ client_id: googleClientId, callback: handleCredential });
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: "outline",
          size: "large",
          text: "signup_with",
          shape: "rectangular",
          width: 320,
          locale: "vi",
        });
        verifyGoogleButtonVisible();
      } catch {
        setGoogleError(blockedMessage());
      }
    };

    if (window.google?.accounts?.id) {
      renderGoogleButton();
    } else {
      const existing = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');
      const script = existing || document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = renderGoogleButton;
      script.onerror = () => setGoogleError(T.googleScriptFail);
      if (!existing) document.head.appendChild(script);
      if (existing && window.google?.accounts?.id) renderGoogleButton();
    }

    return () => {
      cancelled = true;
      window.clearInterval(pollTimer);
    };
  }, [googleClientId, loginUser, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await apiRegister(email, password, fullName, phone || undefined);
      setSuccess(true);
      window.setTimeout(() => router.push("/login"), 2500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : T.fail;
      setError(message);
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16 fade-in">
      <div className="bg-card border border-border rounded-2xl p-6 sm:p-10 shadow-md space-y-6">
        <div className="text-center space-y-2">
          <span className="text-4xl text-primary select-none" aria-hidden>{T.wheel}</span>
          <h2 className="font-serif text-2xl font-bold text-foreground">{T.title}</h2>
          <p className="text-xs text-muted">{T.subtitle}</p>
        </div>

        {success ? (
          <div className="text-center py-10 space-y-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/40 rounded-xl p-4">
            <CheckCircle2 size={44} className="text-green-500 mx-auto" />
            <h4 className="font-bold text-foreground text-sm">{T.successTitle}</h4>
            <p className="text-xs text-muted leading-relaxed">{T.successText}</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {googleClientId ? (
                <div className="space-y-2">
                  <div className="flex min-h-11 justify-center">
                    <div ref={googleButtonRef} aria-label={T.googleLabel} />
                  </div>
                  {googleError && (
                    <button type="button" disabled className="w-full rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm font-semibold text-muted-foreground opacity-80">
                      {T.googleUnavailable}
                    </button>
                  )}
                </div>
              ) : (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
                  {T.googleNotConfigured} <span className="font-mono">NEXT_PUBLIC_GOOGLE_CLIENT_ID</span>{" cho frontend v\u00e0 "}
                  <span className="font-mono">GOOGLE_CLIENT_ID</span>{" cho backend."}
                </div>
              )}
              {googleError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-200">
                  {googleError}
                  {origin && origin !== "https://phatgiao.rollyhub.com" ? (
                    <div className="mt-1 font-mono text-[11px]">{T.currentOrigin}: {origin}</div>
                  ) : null}
                </div>
              )}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                <span>{T.divider}</span>
                <span className="h-px flex-1 bg-border" />
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-muted uppercase">{T.fullName}</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 text-muted-foreground" size={14} />
                  <input required type="text" placeholder={T.fullNamePlaceholder} value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full text-xs pl-10 py-2.5" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-muted uppercase">{T.email}</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 text-muted-foreground" size={14} />
                  <input required type="email" placeholder="phattu@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full text-xs pl-10 py-2.5" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-muted uppercase">{T.phone}</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 text-muted-foreground" size={14} />
                  <input type="tel" placeholder="0901234567" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full text-xs pl-10 py-2.5" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-muted uppercase">{T.password}</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 text-muted-foreground" size={14} />
                  <input required type="password" placeholder={T.passwordPlaceholder} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full text-xs pl-10 py-2.5" minLength={8} autoComplete="new-password" />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/30 rounded-lg text-xs text-center font-medium">
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-md text-xs transition-all hover:bg-primary/95 disabled:opacity-50 flex items-center justify-center space-x-1.5 shadow-sm">
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={14} />
                    <span>{T.processing}</span>
                  </>
                ) : (
                  <span>{T.submit}</span>
                )}
              </button>
            </form>
          </>
        )}

        <div className="text-center text-xs text-muted-foreground border-t border-border/40 pt-4">
          <span>{T.haveAccount}</span>
          <Link href="/login" className="text-primary font-semibold hover:underline">{T.loginNow}</Link>
        </div>
      </div>
    </div>
  );
}
