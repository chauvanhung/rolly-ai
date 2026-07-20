"use client";

import React, { useState } from "react";
import GenericAdminTable from "@/components/GenericAdminTable";
import { api } from "@/services/api";
import { X, Loader2 } from "lucide-react";

/**
 * Quản lý Giảng sư / Nhà sư (Teachers).
 * Bài giảng / khóa tu có thể để trống giảng sư nếu chưa rõ.
 */
export default function AdminTeachersPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<any>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [organization, setOrganization] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [status, setStatus] = useState("published");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const columns = [
    { key: "name", label: "Tên", render: (item: any) => <span className="font-bold text-sm">{item.name}</span> },
    { key: "organization", label: "Tổ chức / Chùa", render: (item: any) => <span>{item.organization || "—"}</span> },
    {
      key: "status",
      label: "Trạng thái",
      render: (item: any) => <span className="text-xs font-mono">{item.status || "—"}</span>,
    },
  ];

  const reset = () => {
    setName("");
    setSlug("");
    setOrganization("");
    setBio("");
    setAvatarUrl("");
    setStatus("published");
    setError("");
  };

  const openAdd = () => {
    setActiveItem(null);
    reset();
    setModalOpen(true);
  };

  const openEdit = (item: any) => {
    setActiveItem(item);
    setName(item.name || "");
    setSlug(item.slug || "");
    setOrganization(item.organization || "");
    setBio(item.bio || "");
    setAvatarUrl(item.avatar_url || "");
    setStatus(item.status || "published");
    setError("");
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Nhập tên giảng sư / nhà sư.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const payload = {
        name: name.trim(),
        slug: slug.trim() || undefined,
        organization: organization.trim() || null,
        bio: bio.trim() || null,
        avatar_url: avatarUrl.trim() || null,
        status,
      };
      if (activeItem?.id) {
        await api(`/teachers/${activeItem.id}`, {
          method: "PATCH",
          body: JSON.stringify({ data: payload }),
        });
      } else {
        await api("/teachers", {
          method: "POST",
          body: JSON.stringify({ data: payload }),
        });
      }
      setModalOpen(false);
      setRefreshTrigger((n) => n + 1);
    } catch (err: any) {
      setError(err.message || "Lỗi lưu giảng sư.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 fade-in">
      <header className="border-b border-border pb-4">
        <h1 className="font-serif text-2xl font-bold text-foreground">Giảng sư / Nhà sư</h1>
        <p className="text-xs text-muted font-medium max-w-2xl">
          Danh sách dùng cho bài giảng, bài pháp, khóa tu. Nếu chưa rõ ai thuyết — để trống khi gán bài (không bắt buộc).
        </p>
      </header>

      <GenericAdminTable
        module="teachers"
        label="giảng sư"
        columns={columns}
        searchPlaceholder="Tìm tên, tổ chức..."
        hasStatusFilter={true}
        canPublish={true}
        onEdit={openEdit}
        onAddNew={openAdd}
        refreshTrigger={refreshTrigger}
      />

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60" onClick={() => setModalOpen(false)} />
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <h2 className="font-serif text-base font-bold">
                {activeItem ? "Sửa giảng sư" : "Thêm giảng sư / nhà sư"}
              </h2>
              <button type="button" onClick={() => setModalOpen(false)} className="p-1 rounded hover:bg-muted">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-3 p-5">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-muted">Tên *</label>
                <input
                  className="w-full text-sm"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ví dụ: Hòa thượng Thích …"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-muted">Slug (tuỳ chọn)</label>
                <input
                  className="w-full text-xs font-mono"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="tu dong-tao-neu-de-trong"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-muted">Tổ chức / Chùa</label>
                <input
                  className="w-full text-sm"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder="Thiền viện / chùa…"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-muted">Tiểu sử ngắn</label>
                <textarea
                  className="w-full text-sm"
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Giới thiệu ngắn…"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-muted">URL ảnh đại diện</label>
                <input
                  className="w-full text-xs font-mono"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="/api/uploads/…"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-muted">Trạng thái</label>
                <select className="w-full text-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="published">Xuất bản</option>
                  <option value="draft">Nháp</option>
                  <option value="hidden">Ẩn</option>
                </select>
              </div>
              {error && <div className="rounded bg-red-50 p-2 text-xs text-red-700">{error}</div>}
              <div className="flex justify-end gap-2 border-t border-border pt-3">
                <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold">
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50"
                >
                  {loading && <Loader2 size={14} className="animate-spin" />}
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
