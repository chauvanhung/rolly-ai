"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AppContext";
import { api } from "@/services/api";
import { User, Bookmark, History, Calendar, LogOut, Loader2, ArrowRight } from "lucide-react";

export default function AccountPage() {
  const { user, loading: authLoading, logoutUser } = useAuth();
  const router = useRouter();
  
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [progress, setProgress] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wait until auth state is loaded
    if (authLoading) return;
    
    // Redirect if not logged in
    if (!user) {
      router.push("/login");
      return;
    }

    async function loadUserData() {
      setLoading(true);
      try {
        const [bmRes, progRes, regRes] = await Promise.all([
          api("/user/bookmarks"),
          api("/user/progress"),
          api("/user/retreats"),
        ]);
        setBookmarks(bmRes || []);
        setProgress(progRes || []);
        setRegistrations(regRes || []);
      } catch (err) {
        console.error("Error loading account data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadUserData();
  }, [user, authLoading, router]);

  const handleLogout = () => {
    logoutUser();
    router.push("/login");
  };

  if (authLoading || (loading && !user)) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-muted">
        <Loader2 className="animate-spin mr-2 text-primary" size={24} />
        <span className="text-sm font-semibold">Đang tải hồ sơ...</span>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 space-y-10 fade-in">
      {/* Page Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-border pb-6 gap-4">
        <div className="space-y-1">
          <h1 className="font-serif text-3xl font-bold text-foreground">Hồ Sơ Phật Tử</h1>
          <p className="text-xs text-muted font-mono">Đạo danh / Tên: {user.full_name} | Email: {user.email}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center space-x-1 border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-950 dark:hover:bg-red-950/20 px-4 py-2 rounded-full text-xs font-semibold transition-colors"
        >
          <LogOut size={14} />
          <span>Đăng xuất</span>
        </button>
      </header>

      {/* Main Grid content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Profile Info Card */}
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="font-serif text-base font-bold text-foreground flex items-center border-b border-border/40 pb-2.5">
              <User className="text-primary mr-1.5" size={18} />
              <span>Thông tin tài khoản</span>
            </h3>
            <ul className="space-y-3 text-xs text-muted font-medium">
              <li className="flex justify-between">
                <span>Họ và tên:</span>
                <span className="text-foreground">{user.full_name}</span>
              </li>
              <li className="flex justify-between">
                <span>Địa chỉ Email:</span>
                <span className="text-foreground font-mono">{user.email}</span>
              </li>
              <li className="flex justify-between">
                <span>Số điện thoại:</span>
                <span className="text-foreground font-mono">{user.phone || "—"}</span>
              </li>
              <li className="flex justify-between">
                <span>Ngày tham gia:</span>
                <span className="text-foreground font-mono">
                  {new Date(user.created_at).toLocaleDateString("vi-VN")}
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Right Side: Tabular panels (Bookmarks, Progress, Retreats) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Section 1: Bookmarks */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="font-serif text-base font-bold text-foreground flex items-center border-b border-border/40 pb-2.5">
              <Bookmark className="text-primary mr-1.5" size={18} />
              <span>Kinh sách & Pháp bảo đã lưu ({bookmarks.length})</span>
            </h3>
            
            {bookmarks.length === 0 ? (
              <p className="text-xs text-muted italic py-2">Quý Phật tử chưa lưu trữ kinh sách nào.</p>
            ) : (
              <div className="space-y-3">
                {bookmarks.map((bm) => {
                  const isSutra = bm.item_type === "sutra";
                  const link = isSutra ? `/sutras/${bm.sutra_slug}` : `/articles/${bm.dharma_talk_slug}`;
                  return (
                    <div key={bm.id} className="flex justify-between items-center text-xs p-2 hover:bg-border/5 rounded transition-colors">
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] text-primary font-bold uppercase tracking-wider block font-mono">
                          {isSutra ? "Kinh điển" : "Bài pháp"}
                        </span>
                        <h4 className="font-semibold text-foreground truncate mt-0.5">{bm.title}</h4>
                      </div>
                      <Link href={link} className="flex items-center text-primary font-bold hover:underline shrink-0 pl-4">
                        <span>Đọc tiếp</span>
                        <ArrowRight size={13} className="ml-0.5" />
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: Reading Progress */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="font-serif text-base font-bold text-foreground flex items-center border-b border-border/40 pb-2.5">
              <History className="text-primary mr-1.5" size={18} />
              <span>Tiến độ đọc tụng kinh điển ({progress.length})</span>
            </h3>
            
            {progress.length === 0 ? (
              <p className="text-xs text-muted italic py-2">Chưa ghi nhận tiến độ đọc gần đây.</p>
            ) : (
              <div className="space-y-4">
                {progress.map((prog) => (
                  <div key={prog.id} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-foreground truncate max-w-sm">{prog.sutra_title}</span>
                      <span className="font-mono text-muted-foreground">{prog.percent_complete}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${prog.percent_complete}%` }} />
                    </div>
                    <span className="text-[9px] text-muted-foreground block text-right font-mono">
                      Cập nhật: {new Date(prog.updated_at).toLocaleDateString("vi-VN")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 3: Registered Retreats */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="font-serif text-base font-bold text-foreground flex items-center border-b border-border/40 pb-2.5">
              <Calendar className="text-primary mr-1.5" size={18} />
              <span>Khóa tu học đã đăng ký ({registrations.length})</span>
            </h3>
            
            {registrations.length === 0 ? (
              <p className="text-xs text-muted italic py-2">Quý Phật tử chưa ghi danh khóa tu học nào.</p>
            ) : (
              <div className="space-y-3">
                {registrations.map((reg) => (
                  <div key={reg.id} className="flex justify-between items-center text-xs p-2 bg-background/50 rounded border border-border">
                    <div>
                      <h4 className="font-semibold text-foreground">{reg.retreat_title}</h4>
                      <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                        Trạng thái đơn: 
                        <span className="ml-1 text-primary font-bold">
                          {reg.status === "approved" ? "Đã duyệt" : reg.status === "cancelled" ? "Đã hủy" : "Đang chờ duyệt"}
                        </span>
                      </p>
                    </div>
                    <span className="text-[10px] text-muted font-mono">
                      Ghi danh: {new Date(reg.created_at).toLocaleDateString("vi-VN")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
