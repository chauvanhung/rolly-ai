import React from "react";
import Link from "next/link";
import { Mail, Phone, Clock, MapPin } from "lucide-react";
import { siteConfig, displayOrPlaceholder } from "@/config/site";

export default function Footer() {
  const templeName = displayOrPlaceholder(siteConfig.templeName, "Tên chùa (đang cập nhật)");
  const address = displayOrPlaceholder(siteConfig.address);
  const phone = displayOrPlaceholder(siteConfig.phone);
  const email = displayOrPlaceholder(siteConfig.email);
  const openHours = displayOrPlaceholder(siteConfig.openHours);

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
            <p className="text-sm text-foreground font-semibold font-serif">{templeName}</p>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold tracking-wider text-foreground uppercase font-serif">
              Thông tin liên hệ
            </h3>
            <ul className="space-y-3 text-sm text-muted">
              <li className="flex items-start space-x-2">
                <MapPin size={18} className="text-primary shrink-0 mt-0.5" aria-hidden />
                <span className={!siteConfig.address ? "italic opacity-70" : undefined}>{address}</span>
              </li>
              <li className="flex items-center space-x-2">
                <Phone size={18} className="text-primary shrink-0" aria-hidden />
                {siteConfig.phoneTel ? (
                  <a href={`tel:${siteConfig.phoneTel}`} className="hover:text-primary transition-colors">
                    {phone}
                  </a>
                ) : (
                  <span className={!siteConfig.phone ? "italic opacity-70" : undefined}>{phone}</span>
                )}
              </li>
              <li className="flex items-center space-x-2">
                <Mail size={18} className="text-primary shrink-0" aria-hidden />
                {siteConfig.email ? (
                  <a href={`mailto:${siteConfig.email}`} className="hover:text-primary transition-colors">
                    {email}
                  </a>
                ) : (
                  <span className="italic opacity-70">{email}</span>
                )}
              </li>
              <li className="flex items-center space-x-2">
                <Clock size={18} className="text-primary shrink-0" aria-hidden />
                <span className={!siteConfig.openHours ? "italic opacity-70" : undefined}>{openHours}</span>
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
            <div className="w-full h-40 rounded-xl overflow-hidden border border-border relative bg-background flex items-center justify-center">
              {siteConfig.mapEmbedUrl ? (
                <iframe
                  title={`Bản đồ ${templeName}`}
                  className="w-full h-full border-0 grayscale-[20%]"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  src={siteConfig.mapEmbedUrl}
                />
              ) : (
                <div className="text-center p-4 space-y-1">
                  <MapPin className="text-primary mx-auto" size={22} aria-hidden />
                  <p className="text-xs text-muted italic">Địa chỉ / bản đồ đang cập nhật</p>
                </div>
              )}
            </div>
            {siteConfig.mapLinkUrl ? (
              <a
                href={siteConfig.mapLinkUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-block text-xs text-primary hover:underline font-semibold"
              >
                Mở Google Maps →
              </a>
            ) : null}
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-8 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>
            © {new Date().getFullYear()} Dharma Hub
            {siteConfig.templeName ? ` · ${siteConfig.templeName}` : ""}. Nội dung tu học được chia sẻ vì lợi ích cộng
            đồng.
          </p>
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
