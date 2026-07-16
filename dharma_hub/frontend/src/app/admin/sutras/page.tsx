"use client";

import React, { useState } from "react";
import GenericAdminTable from "@/components/GenericAdminTable";
import AuditTab from "@/components/AuditTab";
import { api } from "@/services/api";
import { X, Calendar, History, Eye, Pencil, Trash2 } from "lucide-react";

export default function AdminSutrasPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"form" | "audit">("form");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Form states
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [translator, setTranslator] = useState("");
  const [sutraGroup, setSutraGroup] = useState("");
  const [source, setSource] = useState("");
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [readingMinutes, setReadingMinutes] = useState(15);
  const [audioUrl, setAudioUrl] = useState("");
  const [status, setStatus] = useState("draft");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const columns = [
    { key: "title", label: "Tên kinh", render: (item: any) => <span className="font-bold font-serif text-sm">{item.title}</span> },
    { key: "translator", label: "Dịch giả" },
    { key: "sutra_group", label: "Bộ kinh" },
    { key: "reading_minutes", label: "Phút đọc", render: (item: any) => <span>{item.reading_minutes || "—"}</span> },
    { key: "created_at", label: "Ngày tạo", render: (item: any) => <span className="font-mono text-xs">{new Date(item.created_at).toLocaleDateString("vi-VN")}</span> },
  ];

  const openAddModal = () => {
    setActiveItem(null);
    setTitle("");
    setSlug("");
    setTranslator("");
    setSutraGroup("");
    setSource("");
    setSummary("");
    setBody("");
    setReadingMinutes(15);
    setAudioUrl("");
    setStatus("draft");
    
    setError("");
    setActiveTab("form");
    setModalOpen(true);
  };

  const openEditModal = (item: any) => {
    setActiveItem(item);
    setTitle(item.title || "");
    setSlug(item.slug || "");
    setTranslator(item.translator || "");
    setSutraGroup(item.sutra_group || "");
    setSource(item.source || "");
    setSummary(item.summary || "");
    setBody(item.body || "");
    setReadingMinutes(item.reading_minutes || 15);
    setAudioUrl(item.audio_url || "");
    setStatus(item.status || "draft");

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
        title,
        slug: slug || undefined,
        translator: translator || null,
        sutra_group: sutraGroup || null,
        source: source || null,
        summary: summary || null,
        body,
        reading_minutes: Number(readingMinutes),
        audio_url: audioUrl || null,
        status,
      };

      if (activeItem) {
        // PUT /api/v1/sutras/:id
        await api(`/sutras/${activeItem.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        // POST /api/v1/sutras
        await api("/sutras", {
          method: "POST",
          body: JSON.stringify(payload),
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
          <h1 className="font-serif text-2xl font-bold text-foreground">Quản Lý Kinh Điển</h1>
          <p className="text-xs text-muted font-medium">Biên tập các bộ kinh đại thừa, nguyên thủy tụng niệm hằng ngày.</p>
        </div>
      </header>

      {/* Main Table view */}
      <GenericAdminTable
        module="sutras"
        label="bài kinh"
        columns={columns}
        searchPlaceholder="Tìm kiếm tên kinh, dịch giả..."
        onEdit={openEditModal}
        onAddNew={openAddModal}
        refreshTrigger={refreshTrigger}
      />

      {/* Add / Edit Dialog Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/60" onClick={() => setModalOpen(false)} />

          {/* Modal Container */}
          <div className="relative bg-card border border-border w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl shadow-xl flex flex-col animate-scaleUp">
            
            {/* Header Tabs */}
            <div className="flex justify-between items-center px-6 border-b border-border bg-border/5">
              <div className="flex space-x-4">
                <button
                  onClick={() => setActiveTab("form")}
                  className={`py-4 font-bold text-xs border-b-2 transition-all ${
                    activeTab === "form" ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground"
                  }`}
                >
                  {activeItem ? "Chỉnh sửa bài kinh" : "Thêm kinh sách mới"}
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

            {/* Content Container */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === "form" ? (
                <form onSubmit={handleSave} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted uppercase">Tên bài kinh *</label>
                      <input
                        required
                        type="text"
                        placeholder="Kinh Bát Nhã Ba La Mật Đa"
                        value={title}
                        onChange={(e) => {
                          setTitle(e.target.value);
                          // Auto slug generation if not edit
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
                        placeholder="kinh-bat-nha"
                        value={slug}
                        onChange={(e) => setSlug(e.target.value)}
                        className="w-full text-xs font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted uppercase">Dịch giả / Việt dịch</label>
                      <input
                        type="text"
                        placeholder="HT. Thích Trí Quang"
                        value={translator}
                        onChange={(e) => setTranslator(e.target.value)}
                        className="w-full text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted uppercase">Bộ kinh / Nhóm kinh</label>
                      <select
                        value={sutraGroup}
                        onChange={(e) => setSutraGroup(e.target.value)}
                        className="w-full text-xs"
                      >
                        <option value="">Chọn bộ kinh</option>
                        <option value="Kinh Nguyên Thủy">Kinh Nguyên Thủy</option>
                        <option value="Kinh Đại Thừa">Kinh Đại Thừa</option>
                        <option value="Kinh Nhật Tụng">Kinh Nhật Tụng</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted uppercase">Nguồn ấn bản / Nhà xuất bản</label>
                      <input
                        type="text"
                        placeholder="NXB Tôn Giáo"
                        value={source}
                        onChange={(e) => setSource(e.target.value)}
                        className="w-full text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted uppercase">Thời lượng đọc trung bình (phút)</label>
                      <input
                        type="number"
                        min={1}
                        value={readingMinutes}
                        onChange={(e) => setReadingMinutes(Number(e.target.value))}
                        className="w-full text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted uppercase">Địa chỉ MP3 tụng niệm (Audio URL)</label>
                    <input
                      type="url"
                      placeholder="https://example.com/audio.mp3"
                      value={audioUrl}
                      onChange={(e) => setAudioUrl(e.target.value)}
                      className="w-full text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted uppercase">Tóm tắt đại cương kinh văn</label>
                    <textarea
                      rows={2}
                      placeholder="Đại cương nói về chân lý Không tính..."
                      value={summary}
                      onChange={(e) => setSummary(e.target.value)}
                      className="w-full text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted uppercase">Toàn văn kinh tụng niệm *</label>
                    <textarea
                      required
                      rows={8}
                      placeholder="Nhập toàn bộ nội dung kinh tụng niệm tại đây..."
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      className="w-full text-xs font-serif leading-relaxed"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted uppercase">Trạng thái xuất bản</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full text-xs"
                    >
                      <option value="draft">Bản nháp</option>
                      <option value="pending">Chờ phê duyệt</option>
                      <option value="published">Xuất bản công khai</option>
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
                /* History Tab */
                <AuditTab module="sutras" entityId={activeItem.id} />
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
