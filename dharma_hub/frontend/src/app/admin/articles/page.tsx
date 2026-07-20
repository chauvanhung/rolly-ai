"use client";

import React, { useState, useEffect } from "react";
import GenericAdminTable from "@/components/GenericAdminTable";
import AuditTab from "@/components/AuditTab";
import RichTextEditor from "@/components/RichTextEditor";
import { api } from "@/services/api";
import { X, Calendar } from "lucide-react";

export default function AdminArticlesPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"form" | "audit">("form");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Selector choices
  const [teachers, setTeachers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  // Form states
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [authorId, setAuthorId] = useState<number | "">("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [excerpt, setExcerpt] = useState("");
  const [body, setBody] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [status, setStatus] = useState("draft");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load choices
  useEffect(() => {
    async function loadChoices() {
      try {
        const [teachData, catData] = await Promise.all([
          api("/public/teachers"),
          api("/public/categories?module=dharma_talks"),
        ]);
        setTeachers(teachData || []);
        setCategories(catData || []);
      } catch (err) {
        console.error("Error loading teachers/categories:", err);
      }
    }
    loadChoices();
  }, []);

  const columns = [
    { key: "title", label: "Tiêu đề bài pháp", render: (item: any) => <span className="font-bold text-sm">{item.title}</span> },
    { key: "author_name", label: "Giảng sư", render: (item: any) => <span>{item.author_name || "—"}</span> },
    { key: "category_name", label: "Chuyên mục", render: (item: any) => <span>{item.category_name || "—"}</span> },
    { key: "is_pinned", label: "Ghim", render: (item: any) => <span>{item.is_pinned ? "Có 📌" : "Không"}</span> },
    { key: "created_at", label: "Ngày tạo", render: (item: any) => <span className="font-mono text-xs">{new Date(item.created_at).toLocaleDateString("vi-VN")}</span> },
  ];

  const openAddModal = () => {
    setActiveItem(null);
    setTitle("");
    setSlug("");
    setAuthorId("");
    setCategoryId("");
    setExcerpt("");
    setBody("");
    setIsPinned(false);
    setStatus("draft");
    
    setError("");
    setActiveTab("form");
    setModalOpen(true);
  };

  const openEditModal = (item: any) => {
    setActiveItem(item);
    setTitle(item.title || "");
    setSlug(item.slug || "");
    setAuthorId(item.author_id || "");
    setCategoryId(item.category_id || "");
    setExcerpt(item.excerpt || "");
    setBody(item.body || "");
    setIsPinned(Boolean(item.is_pinned));
    setStatus(item.status || "draft");

    setError("");
    setActiveTab("form");
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const plainBody = body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (!plainBody) {
      setError("Vui lòng nhập nội dung chi tiết bài viết.");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        title,
        slug: slug || undefined,
        author_id: authorId ? Number(authorId) : null,
        category_id: categoryId ? Number(categoryId) : null,
        excerpt: excerpt || null,
        body,
        is_pinned: isPinned,
        status,
      };

      if (activeItem) {
        await api(`/dharma_talks/${activeItem.id}`, {
          method: "PATCH",
          body: JSON.stringify({ data: payload }),
        });
      } else {
        await api("/dharma_talks", {
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
          <h1 className="font-serif text-2xl font-bold text-foreground">Quản Lý Bài Pháp</h1>
          <p className="text-xs text-muted font-medium">Viết bài giảng pháp học, chia sẻ kinh nghiệm tu tập Phật tử.</p>
        </div>
      </header>

      <GenericAdminTable
        module="dharma_talks"
        label="bài pháp"
        columns={columns}
        searchPlaceholder="Tìm kiếm tiêu đề, người viết..."
        onEdit={openEditModal}
        onAddNew={openAddModal}
        refreshTrigger={refreshTrigger}
      />

      {/* Modal Dialog */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60" onClick={() => setModalOpen(false)} />

          <div className="relative bg-card border border-border w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl shadow-xl flex flex-col animate-scaleUp">
            
            <div className="flex justify-between items-center px-6 border-b border-border bg-border/5">
              <div className="flex space-x-4">
                <button
                  onClick={() => setActiveTab("form")}
                  className={`py-4 font-bold text-xs border-b-2 transition-all ${
                    activeTab === "form" ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground"
                  }`}
                >
                  {activeItem ? "Chỉnh sửa bài pháp" : "Thêm bài pháp mới"}
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted uppercase">Tiêu đề bài viết *</label>
                      <input
                        required
                        type="text"
                        placeholder="Ý Nghĩa Việc Ăn Chay Chánh Niệm"
                        value={title}
                        onChange={(e) => {
                          setTitle(e.target.value);
                          if (!activeItem) {
                            setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));
                          }
                        }}
                        className="w-full text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted uppercase">Đường dẫn tĩnh (Slug)</label>
                      <input
                        type="text"
                        placeholder="y-nghia-an-chay"
                        value={slug}
                        onChange={(e) => setSlug(e.target.value)}
                        className="w-full text-xs font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted uppercase">Giảng sư chủ trì viết bài</label>
                      <select
                        value={authorId}
                        onChange={(e) => setAuthorId(e.target.value ? Number(e.target.value) : "")}
                        className="w-full text-xs"
                      >
                        <option value="">— Chưa rõ / chưa cập nhật —</option>
                        {teachers.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                      <p className="text-[10px] text-muted">Không bắt buộc.</p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted uppercase">Chuyên mục giáo lý</label>
                      <select
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : "")}
                        className="w-full text-xs"
                      >
                        <option value="">Chọn chuyên mục</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="flex items-center space-x-2 text-xs text-muted cursor-pointer font-semibold py-1.5 select-none hover:text-foreground">
                      <input
                        type="checkbox"
                        checked={isPinned}
                        onChange={(e) => setIsPinned(e.target.checked)}
                        className="rounded accent-primary"
                      />
                      <span>📌 Ghim bài viết lên đầu trang công chúng</span>
                    </label>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted uppercase">Trích đoạn ngắn (Excerpt)</label>
                    <textarea
                      rows={2}
                      placeholder="Trích đoạn tóm tắt bài viết xuất hiện ở danh sách..."
                      value={excerpt}
                      onChange={(e) => setExcerpt(e.target.value)}
                      className="w-full text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted uppercase">Nội dung chi tiết bài viết *</label>
                    <RichTextEditor
                      value={body}
                      onChange={setBody}
                      placeholder="Viết nội dung bài pháp thoại… (editor giống Word, dán từ Word/Docs được)"
                      minHeight="280px"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted uppercase">Trạng thái duyệt</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full text-xs"
                    >
                      <option value="draft">Bản nháp</option>
                      <option value="pending">Chờ kiểm duyệt</option>
                      <option value="published">Xuất bản bài viết</option>
                      <option value="hidden">Ẩn tạm thời</option>
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
                      {loading ? "Đang xử lý..." : "Lưu dữ liệu"}
                    </button>
                  </div>
                </form>
              ) : (
                <AuditTab module="dharma_talks" entityId={activeItem.id} />
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
