"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Mail, Phone, Clock, MapPin, Loader2, Send } from "lucide-react";
import { api } from "@/services/api";
import PageHeader from "@/components/ui/PageHeader";

export default function ContactPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    if (body.trim().length < 10) {
      setMessage("Nội dung tin nhắn cần tối thiểu 10 ký tự.");
      return;
    }
    setLoading(true);
    try {
      const res = await api("/public/contact", {
        method: "POST",
        body: JSON.stringify({
          full_name: fullName,
          email,
          phone: phone || null,
          subject: subject || null,
          body,
        }),
      });
      setSuccess(true);
      setMessage(res.message || "Tin nhắn của bạn đã được gửi thành công.");
      setFullName("");
      setEmail("");
      setPhone("");
      setSubject("");
      setBody("");
    } catch (err: any) {
      setSuccess(false);
      setMessage(err.message || "Lỗi gửi thông tin liên hệ.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8 space-y-12 fade-in">
      <PageHeader
        title="Liên Hệ Đạo Tràng"
        description="Kính mong Phật tử gửi đóng góp ý kiến hoặc thắc mắc về giáo lý tu học, lịch Phật sự để nhà chùa giải đáp."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-12">
        <div className="space-y-8">
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
            <h2 className="font-serif text-lg font-bold text-foreground border-b border-border/40 pb-3">
              Thông tin liên lạc
            </h2>

            <ul className="space-y-4 text-sm text-muted">
              <li className="flex items-start space-x-3">
                <MapPin className="text-primary shrink-0 mt-0.5" size={20} aria-hidden />
                <span>299 Lương Định Của, Phường An Khánh, TP. Thủ Đức, TP. Hồ Chí Minh</span>
              </li>
              <li className="flex items-center space-x-3">
                <Phone className="text-primary shrink-0" size={20} aria-hidden />
                <a href="tel:+842837403388" className="hover:text-primary transition-colors">
                  028 3740 3388
                </a>
              </li>
              <li className="flex items-center space-x-3">
                <Mail className="text-primary shrink-0" size={20} aria-hidden />
                <a href="mailto:lienhe@phatgiao.rollyhub.com" className="hover:text-primary transition-colors">
                  lienhe@phatgiao.rollyhub.com
                </a>
              </li>
              <li className="flex items-center space-x-3">
                <Clock className="text-primary shrink-0" size={20} aria-hidden />
                <span>Mở cửa: 07:30 - 11:30, 13:30 - 21:00</span>
              </li>
            </ul>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-3">
            <h3 className="font-serif text-sm font-bold text-foreground">Bản đồ chỉ đường</h3>
            <div className="w-full h-56 rounded-xl overflow-hidden border border-border">
              <iframe
                title="Bản đồ Chùa Huê Nghiêm"
                className="w-full h-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src="https://maps.google.com/maps?q=Ch%C3%B9a%20Hu%C3%AA%20Nghi%C3%AAm%20L%C6%B0%C6%A1ng%20%C4%90%E1%BB%8Bnh%20C%E1%BB%A7a&t=&z=15&ie=UTF8&iwloc=&output=embed"
              />
            </div>
            <a
              href="https://maps.google.com/?q=Chùa+Huê+Nghiêm+Lương+Định+Của"
              target="_blank"
              rel="noreferrer"
              className="inline-block text-xs bg-primary text-primary-foreground font-bold px-4 py-2.5 rounded-full hover:bg-primary/95 transition-colors min-h-10"
            >
              Mở trên Google Maps
            </a>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 sm:p-8 shadow-sm">
          <h2 className="font-serif text-lg font-bold text-foreground border-b border-border/40 pb-3 mb-6">
            Gửi tin nhắn liên hệ
          </h2>

          {success ? (
            <div className="text-center py-10 space-y-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/40 rounded-xl p-4">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-950 text-green-600 dark:text-green-400 flex items-center justify-center mx-auto text-xl" aria-hidden>
                ✓
              </div>
              <h3 className="font-bold text-foreground text-sm">Gửi thành công!</h3>
              <p className="text-sm text-muted leading-relaxed">
                Xin chân thành cảm ơn ý kiến đóng góp của quý vị. Nhà chùa sẽ phản hồi sớm nhất có thể qua Email
                hoặc Điện thoại.
              </p>
              <button
                type="button"
                onClick={() => setSuccess(false)}
                className="text-sm font-semibold text-primary hover:underline pt-2 block mx-auto min-h-10"
              >
                Gửi tin nhắn khác
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="contact-name" className="text-xs font-bold text-muted uppercase">
                  Họ và tên quý vị *
                </label>
                <input
                  id="contact-name"
                  required
                  type="text"
                  placeholder="Nguyễn Văn A"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="contact-email" className="text-xs font-bold text-muted uppercase">
                    Địa chỉ Email *
                  </label>
                  <input
                    id="contact-email"
                    required
                    type="email"
                    placeholder="email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="contact-phone" className="text-xs font-bold text-muted uppercase">
                    Số điện thoại
                  </label>
                  <input
                    id="contact-phone"
                    type="tel"
                    placeholder="0901234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="contact-subject" className="text-xs font-bold text-muted uppercase">
                  Chủ đề liên hệ
                </label>
                <input
                  id="contact-subject"
                  type="text"
                  placeholder="Góp ý lịch khóa tu, hỏi giáo lý..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="contact-body" className="text-xs font-bold text-muted uppercase">
                  Nội dung tin nhắn *
                </label>
                <textarea
                  id="contact-body"
                  required
                  rows={4}
                  placeholder="Nhập nội dung tin nhắn chi tiết (tối thiểu 10 ký tự)..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full"
                />
              </div>

              <p className="text-xs text-muted-foreground">
                Bằng việc gửi form, quý vị đồng ý với{" "}
                <Link href="/privacy" className="text-primary hover:underline">
                  chính sách bảo mật
                </Link>
                .
              </p>

              {message && !success && (
                <div role="alert" className="p-3 rounded-lg text-sm text-center font-medium bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-300">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/95 font-bold py-3 rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center justify-center space-x-1.5 min-h-12"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    <span>Đang gửi thông tin...</span>
                  </>
                ) : (
                  <>
                    <Send size={16} aria-hidden />
                    <span>Gửi Tin Nhắn Liên Hệ</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
