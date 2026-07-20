"use client";

import React, { useEffect, useState } from "react";
import GenericAdminTable from "@/components/GenericAdminTable";
import AuditTab from "@/components/AuditTab";
import RichTextEditor from "@/components/RichTextEditor";
import { api } from "@/services/api";
import { X, Loader2 } from "lucide-react";

/** Admin tin tức / thông báo — /news công khai. */
export default function AdminNewsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"form" | "audit">("form");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [categories, setCategories] = useState<any[]>([]);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [body, setBody] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [isPinned, setIsPinned] = useState(false);
  const [status, setStatus] = useState("published");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/public/categories?module=news_posts")
      .then((c) => setCategories(c || []))
      .catch(() => setCategories([]));
  }, []);

  const columns = [
    { key: "title", label: "Tiêu đề", render: (item: any) => <span className="font-bold text-sm">{item.title}</span> },
    {
      key: "is_pinned",
      label: "Ghim",
      render: (item: any) => (item.is_pinned ? <span className="text-primary text-xs font-bold">📌</span> : "—"),
    },
    { key: "status", label: "TT", render: (item: any) => <span className="text-[10px] font-bold uppercase">{item.status}</span> },
    {
      key: "created_at",
      label: "Ngày",
      render: (item: any) => (
        <span className="font-mono text-xs">{item.created_at ? new Date(item.created_at).toLocaleDateString("vi-VN") : "—"}</span>
      ),
    },
  ];

  const reset = () => {
    setTitle("");
    setSlug("");
    setExcerpt("");
    setBody("");
    setCategoryId("");
    setIsPinned(false);
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
    setExcerpt(item.excerpt || "");
    setBody(item.body || "");
    setCategoryId(item.category_id || "");
    setIsPinned(Boolean(item.is_pinned));
    setStatus(item.status || "published");
    setError("");
    setActiveTab("form");
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Nhập tiêu đề.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const payload = {
        title: title.trim(),
        slug: slug.trim() || undefined,
        excerpt: excerpt.trim() || null,
        body: body || null,
        category_id: categoryId ? Number(categoryId) : null,
        is_pinned: isPinned,
        status,
      };
      if (activeItem?.id) {
        await api(`/news_posts/${activeItem.id}`, {
          method: "PATCH",
          body: JSON.stringify({ data: payload }),
        });
      } else {
        await api("/news_posts", {
          method: "POST",
          body: JSON.stringify({ data: payload }),
        });
      }
      setModalOpen(false);
      setRefreshTrigger((n) => n + 1);
    } catch (err: any) {
      setError(err.message || "Lỗi lưu tin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 fade-in">
      <header className="border-b border-border pb-4">
        <h1 className="font-serif text-2xl font-bold text-foreground">Tin tức & Thông báo</h1>
        <p className="text-xs text-muted font-medium">Bài xuất bản hiện tại trang <strong>/news</strong>.</p>
      </header>

      <GenericAdminTable
        module="news_posts"
        label="bản tin"
        columns={columns}
        searchPlaceholder="Tìm tiêu đề..."
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
                  <label className="text-[10px] font-bold uppercase text-muted">Tiêu đề *</label>
                  <input className="w-full text-sm font-semibold" value={title} onChange={(e) => setTitle(e.target.value)} required />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-muted">Slug</label>
                    <input className="w-full text-xs font-mono" value={slug} onChange={(e) => setSlug(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-muted">Danh mục</label>
                    <select className="w-full text-xs" value={categoryId} onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : "")}>
                      <option value="">— Không chọn —</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-muted">Tóm tắt</label>
                  <textarea className="w-full text-sm" rows={2} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-muted">Nội dung</label>
                  <RichTextEditor value={body} onChange={setBody} placeholder="Nội dung tin…" minHeight="200px" />
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 text-xs font-semibold">
                    <input type="checkbox" checked={isPinned} onChange={(e) => setIsPinned(e.target.checked)} />
                    Ghim thông báo
                  </label>
                  <select className="text-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
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
                  <button type="submit" disabled={loading} className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">
                    {loading && <Loader2 size={14} className="animate-spin" />}
                    Lưu
                  </button>
                </div>
              </form>
            ) : (
              activeItem?.id && (
                <div className="p-4">
                  <AuditTab module="news_posts" entityId={activeItem.id} />
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
