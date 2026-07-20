"use client";

import React, { useState } from "react";
import GenericAdminTable from "@/components/GenericAdminTable";
import AuditTab from "@/components/AuditTab";
import { api } from "@/services/api";
import { X, Loader2 } from "lucide-react";

/** Admin lịch Phật sự — hiện trên /calendar + chuông thông báo. */
export default function AdminEventsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"form" | "audit">("form");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [recurrence, setRecurrence] = useState("none");
  const [capacity, setCapacity] = useState<number | "">("");
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [status, setStatus] = useState("published");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const columns = [
    { key: "title", label: "Sự kiện", render: (item: any) => <span className="font-bold text-sm">{item.title}</span> },
    {
      key: "start_at",
      label: "Bắt đầu",
      render: (item: any) => (
        <span className="font-mono text-xs">
          {item.start_at ? new Date(item.start_at).toLocaleString("vi-VN") : "—"}
        </span>
      ),
    },
    { key: "location", label: "Địa điểm", render: (item: any) => <span className="text-xs">{item.location || "—"}</span> },
    {
      key: "status",
      label: "TT",
      render: (item: any) => <span className="text-[10px] font-bold uppercase">{item.status}</span>,
    },
  ];

  const toLocalInput = (iso?: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const reset = () => {
    setTitle("");
    setSlug("");
    setDescription("");
    setLocation("");
    setStartAt("");
    setEndAt("");
    setRecurrence("none");
    setCapacity("");
    setRegistrationOpen(false);
    setStatus("published");
    setError("");
  };

  const openAdd = () => {
    setActiveItem(null);
    reset();
    setActiveTab("form");
    setModalOpen(true);
  };

  const openEdit = (item: any) => {
    setActiveItem(item);
    setTitle(item.title || "");
    setSlug(item.slug || "");
    setDescription(item.description || "");
    setLocation(item.location || "");
    setStartAt(toLocalInput(item.start_at));
    setEndAt(toLocalInput(item.end_at));
    setRecurrence(item.recurrence || "none");
    setCapacity(item.capacity ?? "");
    setRegistrationOpen(Boolean(item.registration_open));
    setStatus(item.status || "published");
    setError("");
    setActiveTab("form");
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Nhập tiêu đề sự kiện.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const payload = {
        title: title.trim(),
        slug: slug.trim() || undefined,
        description: description.trim() || null,
        location: location.trim() || null,
        start_at: startAt ? new Date(startAt).toISOString() : null,
        end_at: endAt ? new Date(endAt).toISOString() : null,
        recurrence,
        capacity: capacity === "" ? null : Number(capacity),
        registration_open: registrationOpen,
        status,
      };
      if (activeItem?.id) {
        await api(`/events/${activeItem.id}`, {
          method: "PATCH",
          body: JSON.stringify({ data: payload }),
        });
      } else {
        await api("/events", {
          method: "POST",
          body: JSON.stringify({ data: payload }),
        });
      }
      setModalOpen(false);
      setRefreshTrigger((n) => n + 1);
    } catch (err: any) {
      setError(err.message || "Lỗi lưu sự kiện.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 fade-in">
      <header className="border-b border-border pb-4">
        <h1 className="font-serif text-2xl font-bold text-foreground">Lịch Phật sự</h1>
        <p className="text-xs text-muted font-medium max-w-2xl">
          Sự kiện hiển thị công khai tại <strong>/calendar</strong> và trong chuông thông báo (14 ngày tới).
        </p>
      </header>

      <GenericAdminTable
        module="events"
        label="sự kiện"
        columns={columns}
        searchPlaceholder="Tìm tiêu đề, địa điểm..."
        onEdit={openEdit}
        onAddNew={openAdd}
        refreshTrigger={refreshTrigger}
      />

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60" onClick={() => setModalOpen(false)} />
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab("form")}
                  className={`text-xs font-bold border-b-2 pb-1 ${activeTab === "form" ? "border-primary text-primary" : "border-transparent text-muted"}`}
                >
                  Form
                </button>
                {activeItem?.id && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("audit")}
                    className={`text-xs font-bold border-b-2 pb-1 ${activeTab === "audit" ? "border-primary text-primary" : "border-transparent text-muted"}`}
                  >
                    Audit
                  </button>
                )}
              </div>
              <button type="button" onClick={() => setModalOpen(false)} className="p-1 rounded hover:bg-muted">
                <X size={18} />
              </button>
            </div>
            {activeTab === "form" ? (
              <form onSubmit={handleSave} className="space-y-3 p-5">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-muted">Tiêu đề *</label>
                  <input className="w-full text-sm" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Tụng kinh / phóng sinh / đại lễ…" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-muted">Slug</label>
                  <input className="w-full text-xs font-mono" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="tự tạo nếu trống" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-muted">Bắt đầu</label>
                    <input type="datetime-local" className="w-full text-xs font-mono" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-muted">Kết thúc</label>
                    <input type="datetime-local" className="w-full text-xs font-mono" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-muted">Địa điểm</label>
                  <input className="w-full text-sm" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Chánh điện / Giảng đường…" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-muted">Mô tả</label>
                  <textarea className="w-full text-sm" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-muted">Lặp lại</label>
                    <select className="w-full text-xs" value={recurrence} onChange={(e) => setRecurrence(e.target.value)}>
                      <option value="none">Không</option>
                      <option value="weekly">Hàng tuần</option>
                      <option value="monthly">Hàng tháng</option>
                      <option value="yearly">Hàng năm</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-muted">Trạng thái</label>
                    <select className="w-full text-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
                      <option value="published">Xuất bản</option>
                      <option value="draft">Nháp</option>
                      <option value="hidden">Ẩn</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-muted">Sức chứa</label>
                    <input type="number" min={0} className="w-full text-xs font-mono" value={capacity} onChange={(e) => setCapacity(e.target.value ? Number(e.target.value) : "")} />
                  </div>
                  <label className="flex items-end gap-2 text-xs font-semibold pb-2">
                    <input type="checkbox" checked={registrationOpen} onChange={(e) => setRegistrationOpen(e.target.checked)} />
                    Mở đăng ký
                  </label>
                </div>
                {error && <div className="rounded bg-red-50 p-2 text-xs text-red-700">{error}</div>}
                <div className="flex justify-end gap-2 border-t border-border pt-3">
                  <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold">
                    Hủy
                  </button>
                  <button type="submit" disabled={loading} className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">
                    {loading && <Loader2 size={14} className="animate-spin" />}
                    Lưu
                  </button>
                </div>
              </form>
            ) : (
              activeItem?.id && (
                <div className="p-4">
                  <AuditTab module="events" entityId={activeItem.id} />
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
