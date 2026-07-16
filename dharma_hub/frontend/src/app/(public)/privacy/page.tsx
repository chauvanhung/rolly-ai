"use client";

import React from "react";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8 space-y-10 fade-in">
      <PageHeader
        title="Chính sách bảo mật"
        description="Cam kết bảo vệ thông tin cá nhân của quý Phật tử khi sử dụng Cổng Thông Tin Phật Giáo Dharma Hub."
      />

      <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm text-sm text-muted leading-relaxed">
        <section className="space-y-2">
          <h2 className="font-serif text-lg font-bold text-foreground">1. Thông tin chúng tôi thu thập</h2>
          <p>
            Khi quý vị đăng ký tài khoản, ghi danh khóa tu, đăng ký bản tin hoặc gửi form liên hệ, hệ thống có thể thu thập:
            họ tên, email, số điện thoại, nội dung tin nhắn và các thông tin liên quan đến đăng ký tham dự.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-serif text-lg font-bold text-foreground">2. Mục đích sử dụng</h2>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Xác thực tài khoản và cá nhân hóa trải nghiệm tu học (lưu kinh, tiến độ đọc).</li>
            <li>Xử lý đăng ký khóa tu, thông báo lịch Phật sự và bản tin (khi quý vị đồng ý).</li>
            <li>Phản hồi thắc mắc giáo lý và hỗ trợ liên hệ với đạo tràng.</li>
            <li>Bảo mật hệ thống, ngăn chặn lạm dụng và tuân thủ quy định pháp luật.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-serif text-lg font-bold text-foreground">3. Lưu trữ & bảo vệ</h2>
          <p>
            Dữ liệu được lưu trên hạ tầng có kiểm soát truy cập (xác thực, phân quyền RBAC). Mật khẩu được băm (hash),
            không lưu dạng plain text. Chỉ nhân sự có thẩm quyền mới được xem thông tin đăng ký / liên hệ.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-serif text-lg font-bold text-foreground">4. Chia sẻ với bên thứ ba</h2>
          <p>
            Chúng tôi không bán thông tin cá nhân. Dữ liệu chỉ được chia sẻ khi có yêu cầu pháp lý hợp lệ, hoặc khi cần
            dịch vụ kỹ thuật thiết yếu (hosting, email) theo hợp đồng bảo mật.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-serif text-lg font-bold text-foreground">5. Cookie & thiết bị</h2>
          <p>
            Site có thể lưu token đăng nhập, tùy chọn giao diện (sáng/tối) và cỡ chữ trên trình duyệt của quý vị để
            ghi nhớ trải nghiệm. Quý vị có thể xóa dữ liệu local storage bất kỳ lúc nào trong trình duyệt.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-serif text-lg font-bold text-foreground">6. Quyền của quý Phật tử</h2>
          <p>
            Quý vị có thể yêu cầu xem, chỉnh sửa hoặc xóa thông tin cá nhân bằng cách liên hệ đạo tràng qua trang{" "}
            <Link href="/contact" className="text-primary font-semibold hover:underline">
              Liên hệ
            </Link>{" "}
            hoặc email <strong className="text-foreground">lienhe@phatgiao.rollyhub.com</strong>.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-serif text-lg font-bold text-foreground">7. Cập nhật chính sách</h2>
          <p>
            Chính sách có thể được điều chỉnh khi hệ thống phát triển. Phiên bản hiện tại có hiệu lực từ năm 2026.
            Việc tiếp tục sử dụng site đồng nghĩa với việc chấp nhận các điều khoản cập nhật.
          </p>
        </section>
      </div>
    </div>
  );
}
