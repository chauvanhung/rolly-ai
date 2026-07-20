"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { ArrowLeft, Calendar, MapPin, Loader2, Info, CheckCircle2, User, AlertCircle, Clock } from "lucide-react";
import { api } from "@/services/api";
import { useAuth } from "@/context/AppContext";
import RichTextContent from "@/components/RichTextContent";

interface Params {
  slug: string;
}

export default function RetreatDetailPage({ params }: { params: Promise<Params> }) {
  const { slug } = use(params);
  const { user } = useAuth();
  
  const [retreat, setRetreat] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Form states
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [agreeRules, setAgreeRules] = useState(false);
  const [regLoading, setRegLoading] = useState(false);
  const [regSuccess, setRegSuccess] = useState(false);
  const [regMessage, setRegMessage] = useState("");

  useEffect(() => {
    async function loadRetreat() {
      setLoading(true);
      setError("");
      try {
        const data = await api(`/public/retreats/${slug}`);
        setRetreat(data);
        
        // Auto-fill form if user is logged in
        if (user) {
          setFullName(user.full_name || "");
          setEmail(user.email || "");
          setPhone(user.phone || "");
        }
      } catch (err: any) {
        setError(err.message || "Không tìm thấy thông tin khóa tu.");
      } finally {
        setLoading(false);
      }
    }
    loadRetreat();
  }, [slug, user]);

  const handleSubmitRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegMessage("");
    if (!agreeRules) {
      setRegMessage("Vui lòng đồng ý với các nội quy của khóa tu.");
      return;
    }
    setRegLoading(true);
    try {
      // POST /api/v1/public/retreats/:id/register
      const res = await api(`/public/retreats/${retreat.id}/register`, {
        method: "POST",
        body: JSON.stringify({
          full_name: fullName,
          email: email || null,
          phone: phone,
          note: note || null,
        }),
      });
      setRegSuccess(true);
      setRegMessage(res.message || "Đăng ký thành công.");
      setFullName("");
      setEmail("");
      setPhone("");
      setNote("");
    } catch (err: any) {
      setRegMessage(err.message || "Lỗi đăng ký khóa tu.");
    } finally {
      setRegLoading(false);
    }
  };

  const getSchedule = () => {
    if (!retreat || !retreat.schedule_json) return [];
    try {
      return JSON.parse(retreat.schedule_json);
    } catch {
      return [];
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("vi-VN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-muted">
        <Loader2 className="animate-spin mr-2 text-primary" size={24} />
        <span className="text-sm font-semibold">Đang nạp hồ sơ khóa tu...</span>
      </div>
    );
  }

  if (error || !retreat) {
    return (
      <div className="mx-auto max-w-lg text-center py-20 space-y-4">
        <p className="text-red-500 text-sm font-semibold">{error || "Khóa tu không tồn tại."}</p>
        <Link href="/retreats" className="inline-flex items-center text-sm font-bold text-primary hover:underline">
          <ArrowLeft size={16} className="mr-1" />
          <span>Quay lại danh sách</span>
        </Link>
      </div>
    );
  }

  const schedule = getSchedule();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 fade-in">
      {/* Back button */}
      <div>
        <Link
          href="/retreats"
          className="inline-flex items-center text-sm font-bold text-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft size={16} className="mr-1.5" />
          <span>Danh sách khóa tu</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Info & Schedule */}
        <div className="lg:col-span-2 space-y-8">
          {/* Cover Placeholder Header */}
          <div className="w-full h-56 sm:h-72 bg-gradient-to-r from-primary/10 to-primary/20 rounded-2xl border border-border flex items-center justify-center relative">
            <span className="text-6xl text-primary/10 select-none">☸</span>
            <div className="absolute bottom-4 left-4 right-4 bg-background/90 backdrop-blur-md rounded-xl p-4 border border-border">
              <span className="text-[10px] font-bold text-primary uppercase font-serif tracking-wider">Khóa tu học</span>
              <h1 className="font-serif text-lg sm:text-xl font-bold text-foreground mt-1">{retreat.title}</h1>
            </div>
          </div>

          {/* Description */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-3">
            <h3 className="font-serif text-base font-bold text-foreground">Giới thiệu chương trình tu</h3>
            {retreat.description ? (
              <RichTextContent html={retreat.description} className="text-sm text-[#1a1612]" />
            ) : (
              <p className="text-sm text-[#1a1612]/70 leading-relaxed">Chưa có giới thiệu.</p>
            )}
          </div>

          {/* Daily Schedule */}
          {schedule.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
              <h3 className="font-serif text-base font-bold text-foreground flex items-center border-b border-border/40 pb-2.5">
                <Clock className="text-primary mr-1.5" size={18} />
                <span>Thời khóa tu học hằng ngày</span>
              </h3>
              <div className="space-y-4">
                {schedule.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-start space-x-4">
                    <span className="font-mono text-xs font-bold text-primary bg-primary/5 px-2 py-0.5 rounded border border-primary/10 shrink-0">
                      {item.time}
                    </span>
                    <span className="text-sm text-muted font-medium">{item.activity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Guidelines */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="font-serif text-base font-bold text-foreground flex items-center border-b border-border/40 pb-2.5">
              <Info className="text-primary mr-1.5" size={18} />
              <span>Nội quy & Vật dụng cần chuẩn bị</span>
            </h3>
            <ul className="list-disc pl-5 text-sm text-muted space-y-2">
              <li><strong>Trang phục:</strong> Chuẩn bị y phục lam/nâu hoặc quần áo dài rộng nhã nhặn. Không mặc quần đùi, váy ngắn hoặc đồ hở hang trong suốt khóa tu.</li>
              <li><strong>Vật dụng cá nhân:</strong> Mang theo bàn chải đánh răng, khăn mặt, bình nước cá nhân và các loại thuốc uống cá nhân nếu cần. Không mang trang sức đắt tiền.</li>
              <li><strong>Kỷ luật:</strong> Nghiêm cấm đem theo bia rượu, chất gây nghiện hoặc các thiết bị ghi hình trái phép. Tắt hoặc gửi điện thoại cho Ban quản lý trong những ngày tịnh khẩu.</li>
            </ul>
          </div>
        </div>

        {/* Right Column: Registration Form */}
        <div className="space-y-6">
          {/* Details Card */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="font-serif text-sm font-bold text-foreground border-b border-border/60 pb-2">
              Chi tiết đăng ký
            </h3>
            <div className="space-y-3 text-xs text-muted">
              <div className="flex items-start">
                <Calendar size={14} className="mr-2 text-primary shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-foreground">Ngày bắt đầu:</span>
                  <p className="mt-0.5">{formatDate(retreat.start_at)}</p>
                </div>
              </div>
              <div className="flex items-start">
                <Calendar size={14} className="mr-2 text-primary shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-foreground">Ngày kết thúc:</span>
                  <p className="mt-0.5">{formatDate(retreat.end_at)}</p>
                </div>
              </div>
              <div className="flex items-start">
                <MapPin size={14} className="mr-2 text-primary shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-foreground">Địa điểm:</span>
                  <p className="mt-0.5">{retreat.location || "Đạo tràng chùa"}</p>
                </div>
              </div>
              {retreat.teacher && (
                <div className="flex items-start">
                  <User size={14} className="mr-2 text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-foreground">Giảng sư chính:</span>
                    <p className="mt-0.5">{retreat.teacher.name}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Form Card */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="font-serif text-sm font-bold text-foreground border-b border-border/60 pb-2">
              Đơn đăng ký khóa tu
            </h3>

            {regSuccess ? (
              <div className="text-center py-6 space-y-3">
                <CheckCircle2 size={44} className="text-green-500 mx-auto" />
                <h4 className="font-bold text-foreground text-sm">Đăng ký thành công!</h4>
                <p className="text-xs text-muted leading-relaxed">
                  Nhà chùa đã ghi nhận thông tin đăng ký của bạn. Ban tổ chức sẽ duyệt hồ sơ và gửi email xác nhận.
                </p>
                <button
                  onClick={() => setRegSuccess(false)}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Đăng ký đơn mới
                </button>
              </div>
            ) : !retreat.registration_open ? (
              <div className="text-center py-6 text-muted-foreground text-xs font-medium space-y-2">
                <AlertCircle size={32} className="mx-auto text-muted-foreground/60" />
                <p>Cổng đăng ký khóa tu này hiện đang đóng. Vui lòng liên hệ trực tiếp văn phòng chùa để được trợ giúp.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitRegistration} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-muted uppercase">Họ và tên học viên *</label>
                  <input
                    required
                    type="text"
                    placeholder="Nguyễn Văn A"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-muted uppercase">Số điện thoại *</label>
                  <input
                    required
                    type="tel"
                    placeholder="0901234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-muted uppercase">Địa chỉ Email</label>
                  <input
                    type="email"
                    placeholder="email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-muted uppercase">Ghi chú sức khỏe / Khẩn cấp</label>
                  <textarea
                    rows={3}
                    placeholder="Tiền sử bệnh án (nếu có), thông tin liên hệ người thân khẩn cấp..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full text-xs"
                  />
                </div>

                <label className="flex items-start space-x-2 cursor-pointer text-[10px] text-muted-foreground">
                  <input
                    type="checkbox"
                    required
                    checked={agreeRules}
                    onChange={(e) => setAgreeRules(e.target.checked)}
                    className="rounded mt-0.5 accent-primary"
                  />
                  <span>Tôi cam kết tự nguyện tu học và chấp hành đầy đủ các nội quy thiền môn trên.</span>
                </label>

                {regMessage && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/30 rounded-lg text-[10px] text-center font-medium">
                    {regMessage}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={regLoading}
                  className="w-full bg-primary text-primary-foreground font-bold py-2.5 rounded-md text-xs hover:bg-primary/95 transition-colors disabled:opacity-50"
                >
                  {regLoading ? "Đang xử lý hồ sơ..." : "Gửi Đơn Đăng Ký"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


