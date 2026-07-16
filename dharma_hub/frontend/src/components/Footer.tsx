import React from "react";
import Link from "next/link";
import { Mail, Phone, Clock, MapPin } from "lucide-react";

export default function Footer() {
  return (
    <footer className="w-full bg-card border-t border-border mt-auto transition-colors duration-200">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <span className="text-3xl text-primary" aria-hidden>
                ☸
              </span>
              <span className="font-serif text-2xl font-bold tracking-wide text-foreground">Dharma Hub</span>
            </div>
            <p className="text-sm text-muted font-medium italic leading-relaxed">
              &ldquo;Giữ tâm bình an, sống chậm lại và nhìn rõ từng việc đang diễn ra.&rdquo;
            </p>
            <div className="flex space-x-4 pt-2">
              <a
                href="https://www.facebook.com"
                target="_blank"
                rel="noreferrer"
                className="text-muted hover:text-primary transition-colors p-1"
                title="Facebook chùa"
                aria-label="Facebook"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                </svg>
              </a>
              <a
                href="https://www.youtube.com"
                target="_blank"
                rel="noreferrer"
                className="text-muted hover:text-primary transition-colors p-1"
                title="YouTube"
                aria-label="YouTube"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
                  <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
                </svg>
              </a>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold tracking-wider text-foreground uppercase font-serif">
              Thông tin liên hệ
            </h3>
            <ul className="space-y-3 text-sm text-muted">
              <li className="flex items-start space-x-2">
                <MapPin size={18} className="text-primary shrink-0 mt-0.5" aria-hidden />
                <span>299 Lương Định Của, Phường An Khánh, TP. Thủ Đức, TP. Hồ Chí Minh</span>
              </li>
              <li className="flex items-center space-x-2">
                <Phone size={18} className="text-primary shrink-0" aria-hidden />
                <a href="tel:+842837403388" className="hover:text-primary transition-colors">
                  028 3740 3388
                </a>
              </li>
              <li className="flex items-center space-x-2">
                <Mail size={18} className="text-primary shrink-0" aria-hidden />
                <a href="mailto:lienhe@phatgiao.rollyhub.com" className="hover:text-primary transition-colors">
                  lienhe@phatgiao.rollyhub.com
                </a>
              </li>
              <li className="flex items-center space-x-2">
                <Clock size={18} className="text-primary shrink-0" aria-hidden />
                <span>Mở cửa: 07:30 - 11:30, 13:30 - 21:00</span>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold tracking-wider text-foreground uppercase font-serif">
              Liên kết hữu ích
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/intro" className="text-muted hover:text-primary transition-colors">
                  Giới thiệu chùa & tông chỉ
                </Link>
              </li>
              <li>
                <Link href="/sutras" className="text-muted hover:text-primary transition-colors">
                  Thư viện kinh điển tụng đọc
                </Link>
              </li>
              <li>
                <Link href="/retreats" className="text-muted hover:text-primary transition-colors">
                  Đăng ký tham gia khóa tu
                </Link>
              </li>
              <li>
                <Link href="/charity" className="text-muted hover:text-primary transition-colors">
                  Hoạt động thiện nguyện từ tâm
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-muted hover:text-primary transition-colors">
                  Chính sách bảo mật thông tin
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold tracking-wider text-foreground uppercase font-serif">
              Bản đồ chỉ đường
            </h3>
            <div className="w-full h-40 rounded-xl overflow-hidden border border-border relative bg-background">
              <iframe
                title="Bản đồ Chùa Huê Nghiêm"
                className="w-full h-full border-0 grayscale-[20%]"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src="https://maps.google.com/maps?q=Ch%C3%B9a%20Hu%C3%AA%20Nghi%C3%AAm%20L%C6%B0%C6%A1ng%20%C4%90%E1%BB%8Bnh%20C%E1%BB%A7a&t=&z=15&ie=UTF8&iwloc=&output=embed"
              />
            </div>
            <a
              href="https://maps.google.com/?q=Chùa+Huê+Nghiêm+Lương+Định+Của"
              target="_blank"
              rel="noreferrer"
              className="inline-block text-xs text-primary hover:underline font-semibold"
            >
              Mở Google Maps →
            </a>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-8 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Dharma Hub. Nội dung tu học được chia sẻ vì lợi ích cộng đồng.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/privacy" className="hover:text-primary transition-colors">
              Bảo mật
            </Link>
            <Link href="/contact" className="hover:text-primary transition-colors">
              Liên hệ
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
