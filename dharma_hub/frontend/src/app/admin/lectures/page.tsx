"use client";

import React, { useState, useEffect } from "react";
import GenericAdminTable from "@/components/GenericAdminTable";
import AuditTab from "@/components/AuditTab";
import { api } from "@/services/api";
import { X } from "lucide-react";

export default function AdminLecturesPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"form" | "audit">("form");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Choices list
  const [teachers, setTeachers] = useState<any[]>([]);

  // Form states
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [teacherId, setTeacherId] = useState<number | "">("");
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [durationSeconds, setDurationSeconds] = useState(1800);
  const [seriesName, setSeriesName] = useState("");
  const [seriesOrder, setSeriesOrder] = useState(1);
  const [timestampsJson, setTimestampsJson] = useState("");
  const [transcript, setTranscript] = useState("");
  const [status, setStatus] = useState("draft");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load teachers on mount
  useEffect(() => {
    async function loadTeachers() {
      try {
        const data = await api("/public/teachers");
        setTeachers(data || []);
      } catch (err) {
        console.error("Error loading teachers:", err);
      }
    }
    loadTeachers();
  }, []);

  const columns = [
    { key: "title", label: "Tiêu đề bài giảng", render: (item: any) => <span className="font-bold text-sm">{item.title}</span> },
    { key: "teacher_name", label: "Giảng sư", render: (item: any) => <span>{item.teacher_name || "—"}</span> },
    { key: "kind", label: "Định dạng", render: (item: any) => <span>{item.video_url ? "Video 🎥" : "Audio 🎧"}</span> },
    { key: "series_name", label: "Chuỗi giảng", render: (item: any) => <span>{item.series_name || "—"}</span> },
    { key: "duration_seconds", label: "Thời lượng", render: (item: any) => <span>{Math.floor(item.duration_seconds / 60)} phút</span> },
  ];

  const openAddModal = () => {
    setActiveItem(null);
    setTitle("");
    setSlug("");
    setTeacherId("");
    setDescription("");
    setVideoUrl("");
    setAudioUrl("");
    setDurationSeconds(1800);
    setSeriesName("");
    setSeriesOrder(1);
    setTimestampsJson("[\n  {\"time\": 0, \"label\": \"Khởi niệm giảng sư\"},\n  {\"time\": 300, \"label\": \"Ý nghĩa Chánh niệm\"}\n]");
    setTranscript("");
    setStatus("draft");
    
    setError("");
    setActiveTab("form");
    setModalOpen(true);
  };

  const openEditModal = (item: any) => {
    setActiveItem(item);
    setTitle(item.title || "");
    setSlug(item.slug || "");
    setTeacherId(item.teacher_id || "");
    setDescription(item.description || "");
    setVideoUrl(item.video_url || "");
    setAudioUrl(item.audio_url || "");
    setDurationSeconds(item.duration_seconds || 1800);
    setSeriesName(item.series_name || "");
    setSeriesOrder(item.series_order || 1);
    
    // Format JSON string nicely
    const rawTs = item.timestamps_json;
    if (rawTs) {
      try {
        setTimestampsJson(JSON.stringify(JSON.parse(rawTs), null, 2));
      } catch {
        setTimestampsJson(rawTs);
      }
    } else {
      setTimestampsJson("");
    }
    
    setTranscript(item.transcript || "");
    setStatus(item.status || "draft");

    setError("");
    setActiveTab("form");
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    // Validate Timestamps JSON if input exists
    let formattedTimestamps = null;
    if (timestampsJson.trim()) {
      try {
        const parsed = JSON.parse(timestampsJson);
        if (!Array.isArray(parsed)) throw new Error("JSON phải là dạng mảng (Array).");
        formattedTimestamps = JSON.stringify(parsed);
      } catch (jsonErr: any) {
        setError(`Lỗi định dạng JSON mốc thời gian: ${jsonErr.message}`);
        setLoading(false);
        return;
      }
    }

    try {
      const payload = {
        title,
        slug: slug || undefined,
        teacher_id: teacherId ? Number(teacherId) : null,
        description: description || null,
        video_url: videoUrl || null,
        audio_url: audioUrl || null,
        duration_seconds: Number(durationSeconds),
        series_name: seriesName || null,
        series_order: Number(seriesOrder),
        timestamps_json: formattedTimestamps,
        transcript: transcript || null,
        status,
      };

      if (activeItem) {
        await api(`/lectures/${activeItem.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await api("/lectures", {
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
          <h1 className="font-serif text-2xl font-bold text-foreground">Quản Lý Bài Giảng</h1>
          <p className="text-xs text-muted font-medium">Đăng tải bài thuyết pháp video YouTube hoặc audio pháp âm mp3 từ chư Tăng Ni.</p>
        </div>
      </header>

      <GenericAdminTable
        module="lectures"
        label="bài giảng"
        columns={columns}
        searchPlaceholder="Tìm kiếm bài giảng, giảng sư..."
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
                  {activeItem ? "Chỉnh sửa bài giảng" : "Thêm bài giảng mới"}
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
                      <label className="text-[10px] font-bold text-muted uppercase">Tiêu đề thuyết pháp *</label>
                      <input
                        required
                        type="text"
                        placeholder="Vô Ngã và Con Đường Giải Thoát"
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
                        placeholder="vo-nga-giai-thoat"
                        value={slug}
                        onChange={(e) => setSlug(e.target.value)}
                        className="w-full text-xs font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted uppercase">Giảng sư thuyết pháp *</label>
                      <select
                        required
                        value={teacherId}
                        onChange={(e) => setTeacherId(e.target.value ? Number(e.target.value) : "")}
                        className="w-full text-xs"
                      >
                        <option value="">Chọn giảng sư</option>
                        {teachers.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted uppercase">Thời lượng bài giảng (giây)</label>
                      <input
                        type="number"
                        min={1}
                        value={durationSeconds}
                        onChange={(e) => setDurationSeconds(Number(e.target.value))}
                        className="w-full text-xs font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted uppercase">Địa chỉ Video (YouTube URL)</label>
                      <input
                        type="url"
                        placeholder="https://www.youtube.com/watch?v=..."
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                        className="w-full text-xs font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted uppercase">Địa chỉ Audio MP3 (Audio URL)</label>
                      <input
                        type="url"
                        placeholder="https://example.com/lecture.mp3"
                        value={audioUrl}
                        onChange={(e) => setAudioUrl(e.target.value)}
                        className="w-full text-xs font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted uppercase">Tên chuỗi bài giảng (Series)</label>
                      <input
                        type="text"
                        placeholder="Khóa Giảng Kinh Trung Bộ"
                        value={seriesName}
                        onChange={(e) => setSeriesName(e.target.value)}
                        className="w-full text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted uppercase">Số thứ tự trong chuỗi bài</label>
                      <input
                        type="number"
                        min={1}
                        value={seriesOrder}
                        onChange={(e) => setSeriesOrder(Number(e.target.value))}
                        className="w-full text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted uppercase font-mono">Phân mục mốc thời gian (Timestamps JSON Array)</label>
                    <textarea
                      rows={4}
                      placeholder="[{\x22time\x22: 0, \x22label\x22: \x22Mở đầu\x22}]"
                      value={timestampsJson}
                      onChange={(e) => setTimestampsJson(e.target.value)}
                      className="w-full text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted uppercase">Mô tả bài giảng pháp thoại</label>
                    <textarea
                      rows={2}
                      placeholder="Nhập mô tả ngắn gọn..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted uppercase">Bản ghi âm văn bản (Transcript)</label>
                    <textarea
                      rows={6}
                      placeholder="Bản chép đầy đủ nội dung bài giảng thoại để độc giả xem kết hợp..."
                      value={transcript}
                      onChange={(e) => setTranscript(e.target.value)}
                      className="w-full text-xs leading-relaxed"
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
                      <option value="pending">Chờ kiểm duyệt</option>
                      <option value="published">Xuất bản bài giảng</option>
                      <option value="hidden">Ẩn bài giảng</option>
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
                <AuditTab module="lectures" entityId={activeItem.id} />
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
