"use client";

import React, { useState } from "react";
import GenericAdminTable from "@/components/GenericAdminTable";
import AuditTab from "@/components/AuditTab";
import RichTextEditor from "@/components/RichTextEditor";
import { api } from "@/services/api";
import { X, Loader2 } from "lucide-react";

/** Admin chương trình thiện nguyện — /charity công khai. */
export default function AdminCharitiesPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"form" | "audit">("form");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [progressNote, setProgressNote] = useState("");
  const [report, setReport] = useState("");
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [programStatus, setProgramStatus] = useState("planning");
  const [status, setStatus] = useState("published");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const columns = [
    { key: "title", label: "Chương trình", render: (item: any) => <span className="font-bold text-sm">{item.title}</span> },
    {
      key: "program_status",
      label: "Tiến độ",
      render: (item: any) => <span className="text-xs font-semibold">{item.program_status || "—"}</span>,
    },
    {
      key: "total_income",
      label: "Thu",
      render: (item: any) => (
        <span className="font-mono text-xs text-green-700">
          {Number(item.total_income || 0).toLocaleString("vi-VN")}₫
        </span>
      ),
    },
    {
      key: "total_expense",
      label: "Chi",
      render: (item: any) => (
        <span className="font-mono text-xs text-red-700">
          {Number(item.total_expense || 0).toLocaleString("vi-VN")}₫
        </span>
      ),
    },
  ];

  const reset = () => {
    setTitle("");
    setSlug("");
    setDescription("");
    setProgressNote("");
    setReport("");
    setTotalIncome(0);
    setTotalExpense(0);
    setProgramStatus("planning");
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
    setProgressNote(item.progress_note || "");
    setReport(item.report || "");
    setTotalIncome(Number(item.total_income || 0));
    setTotalExpense(Number(item.total_expense || 0));
    setProgramStatus(item.program_status || "planning");
    setStatus(item.status || "published");
    setError("");
    setActiveTab("form");
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Nhập tên chương trình.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const payload = {
        title: title.trim(),
        slug: slug.trim() || undefined,
        description: description || null,
        progress_note: progressNote.trim() || null,
        report: report.trim() || null,
        total_income: Number(totalIncome) || 0,
        total_expense: Number(totalExpense) || 0,
        program_status: programStatus,
        status,
      };
      if (activeItem?.id) {
        await api(`/charity_programs/${activeItem.id}`, {
          method: "PATCH",
          body: JSON.stringify({ data: payload }),
        });
      } else {
        await api("/charity_programs", {
          method: "POST",
          body: JSON.stringify({ data: payload }),
        });
      }
      setModalOpen(false);
      setRefreshTrigger((n) => n + 1);
    } catch (err: any) {
      setError(err.message || "Lỗi lưu chương trình.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 fade-in">
      <header className="border-b border-border pb-4">
        <h1 className="font-serif text-2xl font-bold text-foreground">Thiện nguyện</h1>
        <p className="text-xs text-muted font-medium">Chương trình hiện công khai tại <strong>/charity</strong>.</p>
      </header>

      <GenericAdminTable
        module="charity_programs"
        label="chương trình"
        columns={columns}
        searchPlaceholder="Tìm chương trình..."
        onEdit={openEdit}
        onAddNew={openAdd}
        refreshTrigger={refreshTrigger}
      />

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60" onClick={() => setModalOpen(false)} />
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-3 sticky top-0 bg-card z-10">
              <div className="flex gap-3">
                <button type="button" onClick={() => setActiveTab("form")} className={`text-xs font-bold border-b-2 pb-1 ${activeTab === "form" ? "border-primary text-primary" : "border-transparent text-muted"}`}>
                  Form
                </button>
                {activeItem?.id && (
                  <button type="button" onClick={() => setActiveTab("audit")} className={`text-xs font-bold border-b-2 pb-1 ${activeTab === "audit" ? "border-primary text-primary" : "border-transparent text-muted"}`}>
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
                  <label className="text-[10px] font-bold uppercase text-muted">Tên chương trình *</label>
                  <input className="w-full text-sm font-semibold" value={title} onChange={(e) => setTitle(e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-muted">Slug</label>
                  <input className="w-full text-xs font-mono" value={slug} onChange={(e) => setSlug(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-muted">Giới thiệu</label>
                  <RichTextEditor value={description} onChange={setDescription} minHeight="140px" placeholder="Mô tả chương trình…" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-muted">Tiến độ / ghi chú</label>
                  <textarea className="w-full text-sm" rows={2} value={progressNote} onChange={(e) => setProgressNote(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-muted">Báo cáo</label>
                  <textarea className="w-full text-sm" rows={2} value={report} onChange={(e) => setReport(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-muted">Tổng thu (₫)</label>
                    <input type="number" min={0} className="w-full text-xs font-mono" value={totalIncome} onChange={(e) => setTotalIncome(Number(e.target.value))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-muted">Tổng chi (₫)</label>
                    <input type="number" min={0} className="w-full text-xs font-mono" value={totalExpense} onChange={(e) => setTotalExpense(Number(e.target.value))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-muted">Trạng thái chương trình</label>
                    <select className="w-full text-xs" value={programStatus} onChange={(e) => setProgramStatus(e.target.value)}>
                      <option value="planning">Lên kế hoạch</option>
                      <option value="active">Đang triển khai</option>
                      <option value="completed">Hoàn thành</option>
                      <option value="closed">Đóng</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-muted">Xuất bản</label>
                    <select className="w-full text-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
                      <option value="published">Xuất bản</option>
                      <option value="draft">Nháp</option>
                      <option value="hidden">Ẩn</option>
                    </select>
                  </div>
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
                  <AuditTab module="charity_programs" entityId={activeItem.id} />
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
