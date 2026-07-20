"use client";

import React from "react";
import Link from "next/link";
import { Info, Award, ShieldAlert, Map, ArrowRight } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import MediaPlaceholder from "@/components/ui/MediaPlaceholder";
import { siteConfig, displayOrPlaceholder } from "@/config/site";

export default function IntroPage() {
  const templeName = displayOrPlaceholder(siteConfig.templeName, "Đạo tràng");
  const hasName = Boolean(siteConfig.templeName.trim());

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 space-y-12 fade-in">
      <PageHeader
        title="Giới thiệu Đạo tràng"
        description="Tìm hiểu về lịch sử hình thành, tông chỉ tu học của chùa và hướng dẫn quy chuẩn hành xử khi đến chiêm bái."
      />

      <section className="bg-card border border-border rounded-xl p-6 sm:p-8 space-y-4 shadow-sm">
        <h2 className="flex items-center text-lg font-bold text-foreground font-serif">
          <Info className="text-primary mr-2" size={20} aria-hidden />
          <span>Lịch sử hình thành & Ý nghĩa tên chùa</span>
        </h2>
        <div className="text-sm text-muted leading-relaxed space-y-3">
          {hasName ? (
            <>
              <p>
                <strong className="text-foreground">{templeName}</strong> được khởi dựng bởi các bậc cao tăng đức
                độ, xây dựng không gian thanh tịnh để hành giả an tâm chuyên sâu nhập định và tu học chánh pháp.
              </p>
              <p>
                Ý nghĩa pháp danh sẽ được bổ sung đầy đủ khi đạo tràng hoàn thiện nội dung giới thiệu chính thức.
              </p>
            </>
          ) : (
            <p className="italic opacity-80">
              Tên chùa và lịch sử hình thành đang được cập nhật. Quý Phật tử vui lòng ghé trang Liên hệ để biết thêm
              thông tin.
            </p>
          )}
        </div>
      </section>

      <section className="bg-card border border-border rounded-xl p-6 sm:p-8 space-y-4 shadow-sm">
        <h2 className="flex items-center text-lg font-bold text-foreground font-serif">
          <Award className="text-primary mr-2" size={20} aria-hidden />
          <span>Tông chỉ tu học & Hoạt động</span>
        </h2>
        <div className="text-sm text-muted leading-relaxed space-y-3">
          <p>
            Đạo tràng nỗ lực xây dựng không gian tu học Phật pháp chính thống, chú trọng kết hợp hài hòa giữa
            Pháp học (nghiên cứu kinh điển giáo lý) và Pháp hành (thực hành thiền định, chánh niệm trong đời
            sống).
          </p>
          <p>Tông chỉ định hướng hoạt động:</p>
          <ul className="list-disc pl-5 space-y-1.5 font-medium text-foreground">
            <li>Nghiên cứu sâu sắc ba tạng kinh điển Nguyên Thủy và Đại Thừa.</li>
            <li>Thực tập thiền tọa và thiền hành nuôi dưỡng định lực mỗi ngày.</li>
            <li>Tham gia tích cực công tác thiện nguyện, chia sẻ an vui xã hội.</li>
            <li>Bài trừ các tập tục mê tín dị đoan, cầu cúng phi lý, thương mại hóa Phật giáo.</li>
          </ul>
        </div>
      </section>

      <section className="bg-card border border-border rounded-xl p-6 sm:p-8 space-y-4 shadow-sm">
        <h2 className="flex items-center text-lg font-bold text-foreground font-serif">
          <Award className="text-primary mr-2" size={20} aria-hidden />
          <span>Tiểu sử Ban trụ trì</span>
        </h2>
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          <MediaPlaceholder variant="avatar" className="mx-auto sm:mx-0" />
          <div className="text-sm text-muted leading-relaxed space-y-2">
            <h3 className="text-base font-bold text-foreground">Ban trụ trì</h3>
            <p className="italic opacity-80">
              Thông tin tiểu sử ban trụ trì đang được cập nhật. Quý Phật tử vui lòng liên hệ đạo tràng để biết
              thêm chi tiết.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-card border border-border rounded-xl p-6 sm:p-8 space-y-4 shadow-sm border-l-4 border-l-accent">
        <h2 className="flex items-center text-lg font-bold text-foreground font-serif">
          <ShieldAlert className="text-accent mr-2" size={20} aria-hidden />
          <span>Quy tắc ứng xử & Nội quy đến chùa</span>
        </h2>
        <div className="text-sm text-muted leading-relaxed space-y-3">
          <p>
            Để giữ gìn không gian thanh tịnh và trang nghiêm nơi thiền môn, kính mong quý Phật tử và khách ghé
            thăm tuân thủ các quy tắc sau:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {[
              {
                t: "Trang phục trang nghiêm",
                d: "Mặc quần áo dài tay, màu sắc nhã nhặn (y phục Phật tử hoặc áo lam, nâu). Không mặc váy ngắn, quần đùi hoặc áo hở vai.",
              },
              {
                t: "Hành xử tĩnh lặng",
                d: "Đi nhẹ, nói khẽ, không cười đùa lớn tiếng. Vui lòng tắt âm thanh điện thoại khi bước vào khu vực Chánh điện hành lễ.",
              },
              {
                t: "Tham gia khóa tu học",
                d: "Phật tử đăng ký khóa tu học cần chấp hành đúng thời khóa, ăn chay chánh niệm, không đem theo đồ ăn mặn hoặc chất cấm.",
              },
              {
                t: "Hướng dẫn công quả",
                d: "Người phát tâm làm công quả dọn dẹp, nấu ăn chay xin vui lòng đăng ký trước tại Ban thư ký chùa để được phân công công việc phù hợp.",
              },
            ].map((item) => (
              <div key={item.t} className="border border-border rounded-lg p-3.5 bg-background/50">
                <h3 className="font-bold text-foreground mb-1 text-sm">{item.t}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-card border border-border rounded-xl p-6 sm:p-8 space-y-4 shadow-sm">
        <h2 className="flex items-center text-lg font-bold text-foreground font-serif">
          <Map className="text-primary mr-2" size={20} aria-hidden />
          <span>Sơ đồ khuôn viên thiền viện</span>
        </h2>
        <div className="text-sm text-muted leading-relaxed space-y-3">
          <p>
            Khuôn viên chùa thường gồm Chánh điện, Nhà Tổ, Giảng đường, Thiền đường và khu nhà bếp phục vụ cơm
            chay. Sơ đồ chi tiết sẽ được bổ sung sau.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center text-xs">
            {["Chánh điện", "Nhà Tổ", "Giảng đường", "Thiền đường", "Nhà bếp", "Sân vườn"].map((z) => (
              <div
                key={z}
                className="border border-border rounded-xl py-6 bg-gradient-to-br from-primary/5 to-calm/5 font-semibold text-foreground"
              >
                {z}
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/retreats"
          className="inline-flex items-center justify-center gap-1.5 bg-primary text-primary-foreground font-bold px-5 py-3 rounded-full text-sm hover:bg-primary/95 min-h-12"
        >
          Đăng ký khóa tu
          <ArrowRight size={16} aria-hidden />
        </Link>
        <Link
          href="/contact"
          className="inline-flex items-center justify-center gap-1.5 border border-border bg-card font-semibold px-5 py-3 rounded-full text-sm hover:border-primary/40 min-h-12"
        >
          Liên hệ đạo tràng
        </Link>
      </div>
    </div>
  );
}
