"use client";

import React, { useState } from "react";
import GenericAdminTable from "@/components/GenericAdminTable";
import AuditTab from "@/components/AuditTab";
import { api } from "@/services/api";
import { X, UserPlus } from "lucide-react";

export default function AdminSubscribersPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"form" | "audit">("form");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Form states
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [interests, setInterests] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const columns = [
    { key: "email", label: "Địa chỉ Email", render: (item: any) => <span className="font-bold font-mono text-sm">{item.email}</span> },
    { key: "full_name", label: "Tên Phật tử", render: (item: any) => <span>{item.full_name || "—"}</span> },
    { key: "phone", label: "Số điện thoại", render: (item: any) => <span className="font-mono text-xs">{item.phone || "—"}</span> },
    { key: "interests", label: "Đề tài quan tâm", render: (item: any) => <span className="text-xs text-muted-foreground">{item.interests || "Tất cả"}</span> },
    { key: "is_active", label: "Bản tin", render: (item: any) => (
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
        item.is_active ? "bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-300" : "bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-300"
      }`}>
        {item.is_active ? "Đang nhận" : "Đã hủy"}
      </span>
    )},
    { key: "created_at", label: "Ngày đăng ký", render: (item: any) => <span className="font-mono text-xs">{new Date(item.created_at).toLocaleDateString("vi-VN")}</span> },
  ];

  const openAddModal = () => {
    setActiveItem(null);
    setEmail("");
    setFullName("");
    setPhone("");
    setInterests("");
    setIsActive(true);
    
    setError("");
    setActiveTab("form");
    setModalOpen(true);
  };

  const openEditModal = (item: any) => {
    setActiveItem(item);
    setEmail(item.email || "");
    setFullName(item.full_name || "");
    setPhone(item.phone || "");
    setInterests(item.interests || "");
    setIsActive(Boolean(item.is_active));

    setError("");
    setActiveTab("form");
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload = {
        email,
        full_name: fullName || null,
        phone: phone || null,
        interests: interests || null,
        is_active: isActive,
      };

      if (activeItem) {
        // PATCH /api/v1/subscribers/:id
        await api(`/subscribers/${activeItem.id}`, {
          method: "PATCH",
          body: JSON.stringify({ data: payload }),
        });
      } else {
        // POST /api/v1/subscribers
        await api("/subscribers", {
          method: "POST",
          body: JSON.stringify({ data: payload }),
        });
      }

      setModalOpen(false);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err: any) {
      setError(err.message || "Lỗi lưu dữ liệu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 fade-in">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground">Danh Sách Nhận Tin</h1>
          <p className="text-xs text-muted font-medium">Quản lý cơ sở dữ liệu email Phật tử đăng ký nhận bản tin Phật sự, lịch khóa tu của thiền viện.</p>
        </div>
      </header>

      <GenericAdminTable
        module="subscribers"
        label="người nhận tin"
        columns={columns}
        searchPlaceholder="Tìm kiếm email, họ tên..."
        onEdit={openEditModal}
        onAddNew={openAddModal}
        refreshTrigger={refreshTrigger}
        canPublish={false}
        hasStatusFilter={false}
        canRestore={false}
      />

      {/* Modal Dialog Form */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60" onClick={() => setModalOpen(false)} />

          <div className="relative bg-card border border-border w-full max-w-xl max-h-[90vh] overflow-hidden rounded-2xl shadow-xl flex flex-col animate-scaleUp">
            
            <div className="flex justify-between items-center px-6 border-b border-border bg-border/5">
              <div className="flex space-x-4">
                <button
                  onClick={() => setActiveTab("form")}
                  className={`py-4 font-bold text-xs border-b-2 transition-all ${
                    activeTab === "form" ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground"
                  }`}
                >
                  {activeItem ? "Chỉnh sửa người nhận tin" : "Thêm người nhận tin thủ công"}
                </button>
                {activeItem && (
                  <button
                    onClick={() => setActiveTab("audit")}
                    className={`py-4 font-bold text-xs border-b-2 transition-all ${
                      activeTab === "audit" ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground"
                    }`}
                  >
                    Lịch sử thay đổi (Audit)
                  </button>
                )}
              </div>
              <button onClick={() => setModalOpen(false)} className="text-muted hover:text-foreground">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === "form" ? (
                <form onSubmit={handleSave} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted uppercase">Địa chỉ Email *</label>
                    <input
                      required
                      type="email"
                      placeholder="phattu@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted uppercase">Họ và tên Phật tử</label>
                    <input
                      type="text"
                      placeholder="Nguyễn Văn A"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted uppercase">Số điện thoại liên lạc</label>
                    <input
                      type="tel"
                      placeholder="0901234567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted uppercase">Đề tài nhận tin (Ngăn cách bằng dấu phẩy)</label>
                    <input
                      type="text"
                      placeholder="kinh-dien,khoa-tu,thien-nguyen"
                      value={interests}
                      onChange={(e) => setInterests(e.target.value)}
                      className="w-full text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted uppercase font-serif">Trạng thái đăng ký nhận tin</label>
                    <select
                      value={isActive ? "true" : "false"}
                      onChange={(e) => setIsActive(e.target.value === "true")}
                      className="w-full text-xs"
                    >
                      <option value="true">Đang kích hoạt nhận tin</option>
                      <option value="false">Tạm ngưng nhận tin (Hủy đăng ký)</option>
                    </select>
                  </div>

                  {error && (
                    <div className="p-3 bg-red-50 text-red-700 text-xs font-medium rounded">
                      {error}
                    </div>
                  )}

                  <div className="flex justify-end space-x-2 border-t border-border pt-4 mt-6">
                    <button
                      type="button"
                      onClick={() => setModalOpen(false)}
                      className="px-4 py-2 border border-border rounded-lg text-xs font-semibold hover:bg-muted-foreground/10"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg text-xs hover:bg-primary/95 disabled:opacity-50"
                    >
                      {loading ? "Đang xử lý..." : "Lưu thông tin"}
                    </button>
                  </div>
                </form>
              ) : (
                <AuditTab module="subscribers" entityId={activeItem.id} />
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
