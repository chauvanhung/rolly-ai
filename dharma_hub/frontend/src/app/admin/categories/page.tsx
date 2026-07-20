"use client";

import React, { useState } from "react";
import GenericAdminTable from "@/components/GenericAdminTable";
import { api } from "@/services/api";
import { X, Loader2 } from "lucide-react";

const MODULE_OPTIONS = [
  { value: "sutras", label: "Kinh điển" },
  { value: "dharma_talks", label: "Bài pháp" },
  { value: "lectures", label: "Bài giảng" },
  { value: "news_posts", label: "Tin tức / thông báo" },
  { value: "retreats", label: "Khóa tu" },
  { value: "events", label: "Sự kiện" },
];

/**
 * Danh mục (Categories) theo module — gán cho kinh, bài pháp, bài giảng…
 */
export default function AdminCategoriesPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<any>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [module, setModule] = useState("lectures");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const moduleLabel = (m: string) => MODULE_OPTIONS.find((o) => o.value === m)?.label || m;

  const columns = [
    { key: "name", label: "Tên danh mục", render: (item: any) => <span className="font-bold text-sm">{item.name}</span> },
    {
      key: "module",
      label: "Áp dụng cho",
      render: (item: any) => (
        <span className="text-xs font-semibold text-primary">{moduleLabel(item.module)}</span>
      ),
    },
    { key: "sort_order", label: "Thứ tự", render: (item: any) => <span className="font-mono text-xs">{item.sort_order ?? 0}</span> },
  ];

  const reset = () => {
    setName("");
    setSlug("");
    setModule("lectures");
    setDescription("");
    setSortOrder(0);
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
    setModule(item.module || "lectures");
    setDescription(item.description || "");
    setSortOrder(item.sort_order ?? 0);
    setError("");
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Nhập tên danh mục.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const payload = {
        name: name.trim(),
        slug: slug.trim() || undefined,
        module,
        description: description.trim() || null,
        sort_order: Number(sortOrder) || 0,
      };
      if (activeItem?.id) {
        await api(`/categories/${activeItem.id}`, {
          method: "PATCH",
          body: JSON.stringify({ data: payload }),
        });
      } else {
        await api("/categories", {
          method: "POST",
          body: JSON.stringify({ data: payload }),
        });
      }
      setModalOpen(false);
      setRefreshTrigger((n) => n + 1);
    } catch (err: any) {
      setError(err.message || "Lỗi lưu danh mục.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 fade-in">
      <header className="border-b border-border pb-4">
        <h1 className="font-serif text-2xl font-bold text-foreground">Danh mục</h1>
        <p className="text-xs text-muted font-medium max-w-2xl">
          Phân loại theo module (kinh, bài pháp, bài giảng, tin…). Khi biên tập bài có thể chọn danh mục — không bắt buộc.
        </p>
      </header>

      <GenericAdminTable
        module="categories"
        label="danh mục"
        columns={columns}
        searchPlaceholder="Tìm tên danh mục, module..."
        hasStatusFilter={false}
        canPublish={false}
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
                {activeItem ? "Sửa danh mục" : "Thêm danh mục"}
              </h2>
              <button type="button" onClick={() => setModalOpen(false)} className="p-1 rounded hover:bg-muted">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-3 p-5">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-muted">Tên danh mục *</label>
                <input
                  className="w-full text-sm"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ví dụ: Pháp thoại định kỳ"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-muted">Áp dụng cho module *</label>
                <select className="w-full text-xs" value={module} onChange={(e) => setModule(e.target.value)}>
                  {MODULE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label} ({o.value})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-muted">Slug (tuỳ chọn)</label>
                <input
                  className="w-full text-xs font-mono"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="tu-dong-neu-de-trong"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-muted">Mô tả</label>
                <textarea
                  className="w-full text-sm"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-muted">Thứ tự sắp xếp</label>
                <input
                  type="number"
                  className="w-full text-xs font-mono"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(Number(e.target.value))}
                />
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
