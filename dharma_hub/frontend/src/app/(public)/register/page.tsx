"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { register as apiRegister } from "@/services/api";
import { User, Lock, Mail, Phone, Loader2, CheckCircle2 } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await apiRegister(email, password, fullName, phone || undefined);
      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 2500); // Redirect after 2.5s
    } catch (err: any) {
      setError(err.message || "Đăng ký thất bại. Email có thể đã tồn tại.");
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16 fade-in">
      <div className="bg-card border border-border rounded-2xl p-6 sm:p-10 shadow-md space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <span className="text-4xl text-primary select-none">☸</span>
          <h2 className="font-serif text-2xl font-bold text-foreground">Đăng Ký Tài Khoản</h2>
          <p className="text-xs text-muted">Trở thành thành viên để lưu trữ kinh văn và cập nhật thời khóa tu học.</p>
        </div>

        {success ? (
          <div className="text-center py-10 space-y-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/40 rounded-xl p-4">
            <CheckCircle2 size={44} className="text-green-500 mx-auto" />
            <h4 className="font-bold text-foreground text-sm">Đăng ký thành công!</h4>
            <p className="text-xs text-muted leading-relaxed">
              Tài khoản Phật tử của bạn đã được khởi tạo. Đang chuyển hướng sang trang đăng nhập trong giây lát...
            </p>
          </div>
        ) : (
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
                  placeholder="•••••••• (Tối thiểu 6 ký tự)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-xs pl-10 py-2.5"
                  minLength={6}
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
              disabled={loading}
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
        )}

        {/* Navigation prompt */}
        <div className="text-center text-xs text-muted-foreground border-t border-border/40 pt-4">
          <span>Đã có tài khoản Phật tử? </span>
          <Link href="/login" className="text-primary font-semibold hover:underline">
            Đăng nhập ngay
          </Link>
        </div>

      </div>
    </div>
  );
}
