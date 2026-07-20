"use client";

import React, { useState } from "react";
import GenericAdminTable from "@/components/GenericAdminTable";
import AuditTab from "@/components/AuditTab";
import { api } from "@/services/api";
import { X, Mail, CheckCircle, Clock } from "lucide-react";

export default function AdminContactsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<any>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const columns = [
    { key: "full_name", label: "Người gửi", render: (item: any) => <span className="font-bold text-sm">{item.full_name}</span> },
    { key: "email", label: "Email", render: (item: any) => <span className="font-mono text-xs">{item.email}</span> },
    { key: "phone", label: "Số điện thoại", render: (item: any) => <span className="font-mono text-xs">{item.phone || "—"}</span> },
    { key: "subject", label: "Chủ đề", render: (item: any) => <span className="truncate max-w-[150px] inline-block">{item.subject || "—"}</span> },
    { key: "is_read", label: "Trạng thái đọc", render: (item: any) => (
      <span>
        {item.is_read ? (
          <span className="inline-flex items-center text-xs text-green-600 font-semibold">
            <CheckCircle size={12} className="mr-1" />
            <span>Đã đọc</span>
          </span>
        ) : (
          <span className="inline-flex items-center text-xs text-amber-600 font-bold">
            <Clock size={12} className="mr-1 animate-pulse" />
            <span>Thư mới</span>
          </span>
        )}
      </span>
    )},
    { key: "created_at", label: "Thời gian gửi", render: (item: any) => <span className="font-mono text-xs">{new Date(item.created_at).toLocaleString("vi-VN")}</span> },
  ];

  const handleViewMessage = async (item: any) => {
    setActiveItem(item);
    setModalOpen(true);
    
    // Automatically mark as read if currently unread
    if (!item.is_read) {
      try {
        // PATCH /api/v1/contact_messages/:id
        await api(`/contact_messages/${item.id}`, {
          method: "PATCH",
          body: JSON.stringify({ data: { is_read: true } }),
        });
        setRefreshTrigger((prev) => prev + 1);
      } catch (err) {
        console.error("Error marking contact message as read:", err);
      }
    }
  };

  return (
    <div className="space-y-6 fade-in">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground">Hòm Thư Liên Hệ</h1>
          <p className="text-xs text-muted font-medium">Tiếp nhận và xem các thắc mắc giáo lý, ý kiến đóng góp Phật tử gửi đến đạo tràng.</p>
        </div>
      </header>

      <GenericAdminTable
        module="contact_messages"
        label="tin nhắn liên hệ"
        columns={columns}
        searchPlaceholder="Tìm người gửi, email, tiêu đề..."
        onView={handleViewMessage}
        refreshTrigger={refreshTrigger}
        canPublish={false}
      />

      {/* Message Reader Modal Dialog */}
      {modalOpen && activeItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60" onClick={() => setModalOpen(false)} />

          <div className="relative bg-card border border-border w-full max-w-xl max-h-[90vh] overflow-hidden rounded-2xl shadow-xl flex flex-col animate-scaleUp">
            
            <div className="flex justify-between items-center px-6 py-4 border-b border-border bg-border/5">
              <h3 className="font-serif text-sm font-bold text-foreground flex items-center">
                <Mail size={16} className="mr-1.5 text-primary" />
                <span>Nội dung thư liên hệ</span>
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-muted hover:text-foreground">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-xs bg-background/50 border border-border rounded-lg p-3">
                <div>
                  <span className="text-[10px] font-bold text-muted uppercase">Người gửi</span>
                  <p className="font-semibold text-foreground mt-0.5">{activeItem.full_name}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted uppercase">Số điện thoại</span>
                  <p className="font-semibold text-foreground mt-0.5">{activeItem.phone || "—"}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] font-bold text-muted uppercase">Địa chỉ Email</span>
                  <p className="font-semibold text-foreground mt-0.5 font-mono">{activeItem.email}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] font-bold text-muted uppercase">Thời gian gửi thư</span>
                  <p className="font-semibold text-foreground mt-0.5 font-mono">
                    {new Date(activeItem.created_at).toLocaleString("vi-VN")}
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-muted uppercase">Chủ đề:</span>
                <p className="text-sm font-bold text-foreground">{activeItem.subject || "Không có chủ đề"}</p>
              </div>

              <div className="space-y-1 pt-2">
                <span className="text-[10px] font-bold text-muted uppercase">Nội dung thư chi tiết:</span>
                <div className="bg-background border border-border rounded-lg p-4 text-xs text-muted leading-relaxed whitespace-pre-line text-justify">
                  {activeItem.body}
                </div>
              </div>
            </div>

            <div className="flex justify-end p-4 border-t border-border bg-border/5">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg text-xs hover:bg-primary/95 transition-colors"
              >
                Đóng hộp thư
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
