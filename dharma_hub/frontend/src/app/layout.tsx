import type { Metadata } from "next";
import { Be_Vietnam_Pro, Noto_Serif } from "next/font/google";
import { AppProvider } from "@/context/AppContext";
import "./globals.css";

const sans = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans-family",
  display: "swap",
});

const serif = Noto_Serif({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "600", "700"],
  variable: "--font-serif-family",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Cổng Thông Tin Phật Giáo | Dharma Hub",
    template: "%s | Dharma Hub",
  },
  description:
    "Không gian tu học dành cho những người mong muốn tìm hiểu Phật pháp, nuôi dưỡng chánh niệm và ứng dụng lời dạy thiện lành vào đời sống hằng ngày.",
  keywords:
    "Phật giáo, kinh điển, bài pháp, khóa tu, lịch Phật sự, thiền tập, chánh niệm, từ bi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`h-full antialiased ${sans.variable} ${serif.variable}`}>
      <body className="min-h-full flex flex-col font-sans">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-md"
        >
          Bỏ qua điều hướng, tới nội dung chính
        </a>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
