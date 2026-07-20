"use client";

import React, { useState, useEffect } from "react";
import GenericAdminTable from "@/components/GenericAdminTable";
import AuditTab from "@/components/AuditTab";
import RichTextEditor from "@/components/RichTextEditor";
import { api } from "@/services/api";
import { X, Upload, Loader2, Music, Image as ImageIcon } from "lucide-react";

export default function AdminLecturesPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"form" | "audit">("form");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Choices list
  const [teachers, setTeachers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  // Form states
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [teacherId, setTeacherId] = useState<number | "">("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [description, setDescription] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [durationSeconds, setDurationSeconds] = useState(1800);
  const [seriesName, setSeriesName] = useState("");
  const [seriesOrder, setSeriesOrder] = useState(1);
  const [timestampsJson, setTimestampsJson] = useState("");
  const [transcript, setTranscript] = useState("");
  const [status, setStatus] = useState("draft");

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState<"audio" | "cover" | null>(null);
  const [error, setError] = useState("");

  // Load teachers + categories (lectures)
  useEffect(() => {
    async function loadChoices() {
      try {
        const [teachData, catData] = await Promise.all([
          api("/public/teachers"),
          api("/public/categories?module=lectures"),
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
    setCategoryId("");
    setDescription("");
    setCoverUrl("");
    setVideoUrl("");
    setAudioUrl("");
    setDurationSeconds(1800);
    setSeriesName("");
    setSeriesOrder(1);
    setTimestampsJson("[\n  {\"time\": 0, \"label\": \"Khởi niệm giảng sư\"},\n  {\"time\": 300, \"label\": \"Ý nghĩa Chánh niệm\"}\n]");
    setTranscript("");
    setStatus("draft");
    setUploading(null);
    setError("");
    setActiveTab("form");
    setModalOpen(true);
  };

  const openEditModal = (item: any) => {
    setActiveItem(item);
    setTitle(item.title || "");
    setSlug(item.slug || "");
    setTeacherId(item.teacher_id || "");
    setCategoryId(item.category_id || "");
    setDescription(item.description || "");
    setCoverUrl(item.cover_url || "");
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
    setUploading(null);
    setActiveTab("form");
    setModalOpen(true);
  };

  /** Upload MP3 / ảnh bìa qua media_assets → gán URL vào form */
  const uploadFile = async (file: File, kind: "audio" | "cover") => {
    if (kind === "audio") {
      const ok = /\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(file.name);
      if (!ok) {
        setError("Chỉ nhận file âm thanh: MP3, WAV, M4A, AAC, OGG, FLAC.");
        return;
      }
      // ~80MB (khớp backend)
      if (file.size > 80 * 1024 * 1024) {
        setError("File audio quá lớn (tối đa 80MB). Hãy nén MP3 hoặc cắt ngắn hơn.");
        return;
      }
    }
    setUploading(kind);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api("/media_assets/upload", {
        method: "POST",
        body: formData,
      });
      const url = res?.data?.url || res?.url;
      if (!url) throw new Error("Upload thành công nhưng không nhận được URL.");
      if (kind === "audio") {
        setAudioUrl(url);
        // Ước lượng thời lượng nếu browser đọc được metadata
        try {
          const objectUrl = URL.createObjectURL(file);
          const audioEl = new Audio();
          audioEl.preload = "metadata";
          audioEl.src = objectUrl;
          audioEl.onloadedmetadata = () => {
            if (Number.isFinite(audioEl.duration) && audioEl.duration > 0) {
              setDurationSeconds(Math.round(audioEl.duration));
            }
            URL.revokeObjectURL(objectUrl);
          };
        } catch {
          /* ignore */
        }
      } else {
        setCoverUrl(url);
      }
    } catch (err: any) {
      setError(err.message || "Lỗi tải tệp lên.");
    } finally {
      setUploading(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!videoUrl.trim() && !audioUrl.trim()) {
      setError("Cần có Video YouTube hoặc file/URL Audio MP3.");
      return;
    }
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
        category_id: categoryId ? Number(categoryId) : null,
        description: description || null,
        cover_url: coverUrl || null,
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
          method: "PATCH",
          body: JSON.stringify({ data: payload }),
        });
      } else {
        await api("/lectures", {
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
                      <label className="text-[10px] font-bold text-muted uppercase">Giảng sư thuyết pháp</label>
                      <select
                        value={teacherId}
                        onChange={(e) => setTeacherId(e.target.value ? Number(e.target.value) : "")}
                        className="w-full text-xs"
                      >
                        <option value="">— Chưa rõ / chưa cập nhật —</option>
                        {teachers.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                      <p className="text-[10px] text-muted">Không bắt buộc. Thêm giảng sư tại menu «Giảng sư / Nhà sư».</p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted uppercase">Danh mục (tuỳ chọn)</label>
                      <select
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : "")}
                        className="w-full text-xs"
                      >
                        <option value="">— Không chọn —</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
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

                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-[10px] font-bold text-muted uppercase">Địa chỉ Video (YouTube URL)</label>
                      <input
                        type="text"
                        placeholder="https://www.youtube.com/watch?v=..."
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                        className="w-full text-xs font-mono"
                      />
                    </div>

                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-[10px] font-bold text-muted uppercase">Audio MP3 — upload hoặc dán URL</label>
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="text"
                          placeholder="/api/uploads/....mp3 hoặc https://..."
                          value={audioUrl}
                          onChange={(e) => setAudioUrl(e.target.value)}
                          className="min-w-0 flex-1 text-xs font-mono"
                        />
                        <label
                          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 text-xs font-bold text-primary hover:bg-primary/10 ${
                            uploading === "audio" ? "opacity-60 pointer-events-none" : ""
                          }`}
                        >
                          {uploading === "audio" ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Upload size={14} />
                          )}
                          {uploading === "audio" ? "Đang tải…" : "Chọn file MP3"}
                          <input
                            type="file"
                            accept="audio/mpeg,audio/mp3,audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac"
                            className="hidden"
                            disabled={!!uploading}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              e.target.value = "";
                              if (f) void uploadFile(f, "audio");
                            }}
                          />
                        </label>
                      </div>
                      {audioUrl && (
                        <p className="flex items-center gap-1.5 text-[11px] text-green-700">
                          <Music size={12} />
                          Đã gắn: <span className="font-mono truncate max-w-full">{audioUrl}</span>
                        </p>
                      )}
                      <p className="text-[10px] text-muted">
                        Chọn file từ máy → upload lên server (tối đa 80MB). Không cần dán URL tay.
                      </p>
                    </div>

                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-[10px] font-bold text-muted uppercase">Ảnh bìa (tuỳ chọn)</label>
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="text"
                          placeholder="/api/uploads/....jpg"
                          value={coverUrl}
                          onChange={(e) => setCoverUrl(e.target.value)}
                          className="min-w-0 flex-1 text-xs font-mono"
                        />
                        <label
                          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-bold hover:bg-muted/40 ${
                            uploading === "cover" ? "opacity-60 pointer-events-none" : ""
                          }`}
                        >
                          {uploading === "cover" ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <ImageIcon size={14} />
                          )}
                          {uploading === "cover" ? "Đang tải…" : "Upload ảnh"}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={!!uploading}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              e.target.value = "";
                              if (f) void uploadFile(f, "cover");
                            }}
                          />
                        </label>
                      </div>
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
                    <RichTextEditor
                      value={description}
                      onChange={setDescription}
                      placeholder="Mô tả ngắn gọn bài giảng… (có thể format như Word)"
                      minHeight="120px"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted uppercase">Bản ghi âm văn bản (Transcript)</label>
                    <RichTextEditor
                      value={transcript}
                      onChange={setTranscript}
                      placeholder="Bản chép bài giảng… (format giống Word)"
                      minHeight="220px"
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
                      disabled={loading || !!uploading}
                      className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg text-xs hover:bg-primary/95 disabled:opacity-50"
                    >
                      {loading ? "Đang xử lý..." : uploading ? "Đang upload…" : "Lưu dữ liệu"}
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
