"use client";

import React, { useState, useEffect } from "react";
import GenericAdminTable from "@/components/GenericAdminTable";
import AuditTab from "@/components/AuditTab";
import { api } from "@/services/api";
import {
  X,
  Upload,
  FileText,
  Image as ImageIcon,
  Loader2,
  Music,
  Plus,
  Trash2,
  BookOpen,
  Save,
} from "lucide-react";
import RichTextEditor from "@/components/RichTextEditor";

type Chapter = {
  id?: number;
  title: string;
  /** Tầng trên: Tập / Quyển (vd. "Tập 1"). Trống = không phân tập. */
  volume_title?: string;
  body: string;
  sort_order: number;
  is_deleted?: boolean;
};

/**
 * Quy ước biên tập:
 * - Nikāya (Trung/Trường…): 1 sutta = 1 bài kinh (body hoặc 1 chương "Toàn văn").
 * - Kinh dài: 1 bài + nhiều chương/phẩm; có thể gán Tập/Quyển (Tập → Chương).
 * - Trang đọc: ≥2 chương → mục lục; có volume_title thì hiện theo Tập.
 */
export default function AdminSutrasPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"form" | "chapters" | "audit">("form");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [translator, setTranslator] = useState("");
  const [sutraGroup, setSutraGroup] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [source, setSource] = useState("");
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [readingMinutes, setReadingMinutes] = useState(15);
  const [coverUrl, setCoverUrl] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [status, setStatus] = useState("draft");
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [sutraCategories, setSutraCategories] = useState<any[]>([]);

  useEffect(() => {
    api("/public/categories?module=sutras")
      .then((cats) => setSutraCategories(cats || []))
      .catch(() => setSutraCategories([]));
  }, []);

  const [loading, setLoading] = useState(false);
  const [chapterLoading, setChapterLoading] = useState(false);
  const [uploading, setUploading] = useState<"cover" | "pdf" | "audio" | null>(null);
  const [error, setError] = useState("");
  const [chapterNotice, setChapterNotice] = useState("");

  // New chapter draft
  const [newChTitle, setNewChTitle] = useState("");
  const [newChVolume, setNewChVolume] = useState("");
  const [newChBody, setNewChBody] = useState("");
  /** Tab chương đang chọn: key chương hoặc "new"; null = chưa chọn */
  const [activeChapterKey, setActiveChapterKey] = useState<string | null>(null);

  const columns = [
    {
      key: "title",
      label: "Tên kinh",
      render: (item: any) => (
        <div className="flex items-center gap-2 min-w-0">
          {item.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.cover_url} alt="" className="w-9 h-9 rounded object-cover border border-border shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded bg-muted/40 border border-border flex items-center justify-center shrink-0">
              <ImageIcon size={14} className="text-muted" />
            </div>
          )}
          <span className="font-bold font-serif text-sm truncate">{item.title}</span>
        </div>
      ),
    },
    { key: "translator", label: "Dịch giả" },
    { key: "sutra_group", label: "Bộ kinh" },
    {
      key: "pdf_url",
      label: "PDF",
      render: (item: any) =>
        item.pdf_url ? (
          <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">PDF</span>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
    {
      key: "reading_minutes",
      label: "Phút đọc",
      render: (item: any) => <span>{item.reading_minutes || "—"}</span>,
    },
  ];

  const resetForm = () => {
    setTitle("");
    setSlug("");
    setTranslator("");
    setSutraGroup("");
    setCategoryId("");
    setSource("");
    setSummary("");
    setBody("");
    setReadingMinutes(15);
    setCoverUrl("");
    setPdfUrl("");
    setAudioUrl("");
    setStatus("draft");
    setChapters([]);
    setNewChTitle("");
    setNewChVolume("");
    setNewChBody("");
    setActiveChapterKey(null);
    setError("");
    setChapterNotice("");
  };

  const chapterKey = (ch: Chapter, index: number) =>
    ch.id != null ? `id-${ch.id}` : `idx-${index}`;

  const openAddModal = () => {
    setActiveItem(null);
    resetForm();
    setActiveTab("form");
    setModalOpen(true);
  };

  const openEditModal = async (item: any) => {
    setError("");
    setChapterNotice("");
    setActiveItem(item);
    setTitle(item.title || "");
    setSlug(item.slug || "");
    setTranslator(item.translator || "");
    setSutraGroup(item.sutra_group || "");
    setCategoryId(item.category_id || "");
    setSource(item.source || "");
    setSummary(item.summary || "");
    setBody(item.body || "");
    setReadingMinutes(item.reading_minutes || 15);
    setCoverUrl(item.cover_url || "");
    setPdfUrl(item.pdf_url || "");
    setAudioUrl(item.audio_url || "");
    setStatus(item.status || "draft");
    setActiveTab("form");
    setModalOpen(true);

    // Load full detail + chapters
    try {
      const full = await api(`/sutras/${item.id}`);
      setActiveItem(full);
      setBody(full.body || "");
      const chs = (full.chapters || [])
        .filter((c: Chapter) => !c.is_deleted)
        .sort((a: Chapter, b: Chapter) => (a.sort_order || 0) - (b.sort_order || 0))
        .map((c: Chapter) => ({
          id: c.id,
          title: c.title || "",
          volume_title: c.volume_title || "",
          body: c.body || "",
          sort_order: c.sort_order ?? 0,
        }));
      setChapters(chs);
      // Mở tab chương đầu tiên (nếu có) để soạn ngay
      setActiveChapterKey(chs.length ? chapterKey(chs[0], 0) : "new");
    } catch {
      setChapters([]);
      setActiveChapterKey("new");
    }
  };

  const uploadFile = async (file: File, kind: "cover" | "pdf" | "audio") => {
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
      if (kind === "cover") setCoverUrl(url);
      if (kind === "pdf") setPdfUrl(url);
      if (kind === "audio") setAudioUrl(url);
    } catch (err: any) {
      setError(err.message || "Lỗi tải tệp lên.");
    } finally {
      setUploading(null);
    }
  };

  const rebuildBodyFromChapters = (chs: Chapter[]) => {
    if (!chs.length) return body;
    let lastVol = "";
    const parts: string[] = [];
    chs.forEach((c, i) => {
      const vol = (c.volume_title || "").trim();
      if (vol && vol !== lastVol) {
        parts.push(`<h2 class="volume">${escapeHtml(vol)}</h2>`);
      }
      lastVol = vol;
      parts.push(`<h3>${i + 1}. ${escapeHtml(c.title)}</h3>${c.body || ""}`);
    });
    return parts.join("<hr/>");
  };

  /** Danh sách tên tập đã dùng (gợi ý khi gõ). */
  const knownVolumes = Array.from(
    new Set(chapters.map((c) => (c.volume_title || "").trim()).filter(Boolean))
  );

  function escapeHtml(s: string) {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // Nếu có nhiều chương: body = ghép chương (để tìm kiếm / tóm tắt)
      const finalBody =
        chapters.length > 0 ? rebuildBodyFromChapters(chapters) : body;
      if (!finalBody?.replace(/<[^>]+>/g, "").trim() && chapters.length === 0) {
        throw new Error("Vui lòng nhập nội dung toàn văn.");
      }

      const payload = {
        title,
        slug: slug || undefined,
        translator: translator || null,
        sutra_group: sutraGroup || null,
        category_id: categoryId ? Number(categoryId) : null,
        source: source || null,
        summary: summary || null,
        body: finalBody,
        reading_minutes: Number(readingMinutes),
        cover_url: coverUrl || null,
        pdf_url: pdfUrl || null,
        audio_url: audioUrl || null,
        status,
      };

      if (activeItem?.id) {
        await api(`/sutras/${activeItem.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        const created = await api("/sutras", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        // Tạo 1 chương Toàn văn mặc định nếu có body
        if (created?.id && finalBody?.trim()) {
          await api(`/sutras/${created.id}/chapters`, {
            method: "POST",
            body: JSON.stringify({
              title: "Toàn văn",
              body: finalBody,
              sort_order: 1,
            }),
          });
        }
      }

      setModalOpen(false);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err: any) {
      setError(err.message || "Lỗi lưu dữ liệu.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddChapter = async () => {
    if (!activeItem?.id) {
      setError("Hãy lưu bài kinh trước, rồi mới thêm chương/phẩm.");
      return;
    }
    if (!newChTitle.trim()) {
      setError("Nhập tiêu đề chương/phẩm.");
      return;
    }
    setChapterLoading(true);
    setError("");
    setChapterNotice("");
    try {
      const sort_order = chapters.length ? Math.max(...chapters.map((c) => c.sort_order || 0)) + 1 : 1;
      const volume_title = newChVolume.trim() || null;
      const created = await api(`/sutras/${activeItem.id}/chapters`, {
        method: "POST",
        body: JSON.stringify({
          title: newChTitle.trim(),
          volume_title,
          body: newChBody,
          sort_order,
        }),
      });
      const next = [
        ...chapters,
        {
          id: created.id,
          title: created.title,
          volume_title: created.volume_title || volume_title || "",
          body: created.body || "",
          sort_order: created.sort_order ?? sort_order,
        },
      ];
      setChapters(next);
      setNewChTitle("");
      setNewChVolume(volume_title || "");
      setNewChBody("");
      // Chuyển sang tab chương vừa tạo
      const newKey = created.id != null ? `id-${created.id}` : chapterKey(next[next.length - 1], next.length - 1);
      setActiveChapterKey(newKey);
      // Sync body field
      setBody(rebuildBodyFromChapters(next));
      await api(`/sutras/${activeItem.id}`, {
        method: "PATCH",
        body: JSON.stringify({ body: rebuildBodyFromChapters(next) }),
      });
      setChapterNotice("Đã thêm chương — đang mở tab soạn.");
    } catch (err: any) {
      setError(err.message || "Không thêm được chương.");
    } finally {
      setChapterLoading(false);
    }
  };

  const handleSaveChapter = async (ch: Chapter, index: number) => {
    if (!activeItem?.id || !ch.id) return;
    setChapterLoading(true);
    setError("");
    setChapterNotice("");
    try {
      await api(`/sutras/${activeItem.id}/chapters/${ch.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: ch.title,
          volume_title: (ch.volume_title || "").trim() || null,
          body: ch.body,
          sort_order: ch.sort_order ?? index + 1,
        }),
      });
      const next = [...chapters];
      next[index] = ch;
      setChapters(next);
      const merged = rebuildBodyFromChapters(next);
      setBody(merged);
      await api(`/sutras/${activeItem.id}`, {
        method: "PATCH",
        body: JSON.stringify({ body: merged }),
      });
      setChapterNotice(`Đã lưu chương: ${ch.title}`);
    } catch (err: any) {
      setError(err.message || "Không lưu được chương.");
    } finally {
      setChapterLoading(false);
    }
  };

  const handleDeleteChapter = async (ch: Chapter, index: number) => {
    if (!activeItem?.id || !ch.id) return;
    if (!confirm(`Xóa chương "${ch.title}"?`)) return;
    setChapterLoading(true);
    setError("");
    try {
      await api(`/sutras/${activeItem.id}/chapters/${ch.id}`, { method: "DELETE" });
      const next = chapters.filter((c) => c.id !== ch.id);
      setChapters(next);
      const merged = rebuildBodyFromChapters(next);
      setBody(merged || body);
      if (next.length) {
        await api(`/sutras/${activeItem.id}`, {
          method: "PATCH",
          body: JSON.stringify({ body: merged }),
        });
        // Chọn tab gần nhất còn lại
        const newIdx = Math.min(index, next.length - 1);
        setActiveChapterKey(chapterKey(next[newIdx], newIdx));
      } else {
        setActiveChapterKey("new");
      }
      setChapterNotice("Đã xóa chương.");
    } catch (err: any) {
      setError(err.message || "Không xóa được chương.");
    } finally {
      setChapterLoading(false);
    }
  };

  return (
    <div className="space-y-6 fade-in font-sans">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground">Quản Lý Kinh Điển</h1>
          <p className="text-xs text-muted font-medium max-w-2xl">
            <strong>Nikāya:</strong> mỗi kinh một bài.{" "}
            <strong>Kinh dài (Pháp Hoa, Pháp Cú…):</strong> một bài + nhiều chương/phẩm (tab Chương).
            Trang đọc tự hiện mục lục khi ≥ 2 chương.
          </p>
        </div>
      </header>

      <GenericAdminTable
        module="sutras"
        label="bài kinh"
        columns={columns}
        searchPlaceholder="Tìm kiếm tên kinh, dịch giả..."
        onEdit={openEditModal}
        onAddNew={openAddModal}
        refreshTrigger={refreshTrigger}
      />

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60" onClick={() => setModalOpen(false)} />

          <div className="relative bg-card border border-border w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl shadow-xl flex flex-col">
            <div className="flex justify-between items-center px-6 border-b border-border bg-border/5">
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => setActiveTab("form")}
                  className={`py-4 font-bold text-xs border-b-2 transition-all ${
                    activeTab === "form" ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground"
                  }`}
                >
                  {activeItem ? "Thông tin kinh" : "Thêm kinh mới"}
                </button>
                {activeItem?.id && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("chapters")}
                    className={`py-4 font-bold text-xs border-b-2 transition-all inline-flex items-center gap-1 ${
                      activeTab === "chapters" ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground"
                    }`}
                  >
                    <BookOpen size={12} />
                    Chương / Phẩm ({chapters.length})
                  </button>
                )}
                {activeItem?.id && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("audit")}
                    className={`py-4 font-bold text-xs border-b-2 transition-all ${
                      activeTab === "audit" ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground"
                    }`}
                  >
                    Lịch sử
                  </button>
                )}
              </div>
              <button type="button" onClick={() => setModalOpen(false)} className="text-muted hover:text-foreground">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === "form" && (
                <form onSubmit={handleSave} className="space-y-4">
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
                    <strong>Gợi ý:</strong> Kinh ngắn / từng sutta Nikāya → dán vào “Toàn văn”. Kinh nhiều phẩm → lưu xong, sang tab{" "}
                    <strong>Chương / Phẩm</strong> để tách.
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted uppercase">Tên bài kinh *</label>
                      <input
                        required
                        type="text"
                        value={title}
                        onChange={(e) => {
                          setTitle(e.target.value);
                          if (!activeItem) {
                            setSlug(
                              e.target.value
                                .toLowerCase()
                                .normalize("NFD")
                                .replace(/[\u0300-\u036f]/g, "")
                                .replace(/đ/g, "d")
                                .replace(/[^a-z0-9]+/g, "-")
                                .replace(/(^-|-$)/g, "")
                            );
                          }
                        }}
                        className="w-full text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted uppercase">Slug</label>
                      <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full text-xs font-mono" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted uppercase">Dịch giả</label>
                      <input type="text" value={translator} onChange={(e) => setTranslator(e.target.value)} className="w-full text-xs" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted uppercase">Bộ kinh / danh mục</label>
                      <select
                        value={categoryId}
                        onChange={(e) => {
                          const id = e.target.value ? Number(e.target.value) : "";
                          setCategoryId(id);
                          if (id) {
                            const cat = sutraCategories.find((c) => c.id === id);
                            if (cat?.name) setSutraGroup(cat.name);
                          } else {
                            setSutraGroup("");
                          }
                        }}
                        className="w-full text-xs"
                      >
                        <option value="">— Chưa chọn bộ —</option>
                        {sutraCategories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-muted">
                        Quản lý danh mục tại Admin → Danh mục. Đã gán: {sutraGroup || "—"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted uppercase">Nguồn</label>
                      <input type="text" value={source} onChange={(e) => setSource(e.target.value)} className="w-full text-xs" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted uppercase">Phút đọc</label>
                      <input
                        type="number"
                        min={1}
                        value={readingMinutes}
                        onChange={(e) => setReadingMinutes(Number(e.target.value))}
                        className="w-full text-xs"
                      />
                    </div>
                  </div>

                  {/* Media short row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted uppercase flex items-center gap-1">
                        <ImageIcon size={12} /> Ảnh bìa
                      </label>
                      <label className="inline-flex items-center gap-1 cursor-pointer rounded border border-border px-2 py-1.5 text-[11px] font-semibold">
                        {uploading === "cover" ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                        Tải ảnh
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) void uploadFile(f, "cover");
                            e.target.value = "";
                          }}
                        />
                      </label>
                      <input className="w-full text-[11px] font-mono" value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="URL ảnh" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted uppercase flex items-center gap-1">
                        <FileText size={12} /> PDF
                      </label>
                      <label className="inline-flex items-center gap-1 cursor-pointer rounded border border-border px-2 py-1.5 text-[11px] font-semibold">
                        {uploading === "pdf" ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                        Tải PDF
                        <input
                          type="file"
                          accept="application/pdf,.pdf"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) void uploadFile(f, "pdf");
                            e.target.value = "";
                          }}
                        />
                      </label>
                      <input className="w-full text-[11px] font-mono" value={pdfUrl} onChange={(e) => setPdfUrl(e.target.value)} placeholder="URL PDF" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted uppercase flex items-center gap-1">
                        <Music size={12} /> Audio
                      </label>
                      <label className="inline-flex items-center gap-1 cursor-pointer rounded border border-border px-2 py-1.5 text-[11px] font-semibold">
                        {uploading === "audio" ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                        Tải MP3
                        <input
                          type="file"
                          accept="audio/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) void uploadFile(f, "audio");
                            e.target.value = "";
                          }}
                        />
                      </label>
                      <input className="w-full text-[11px] font-mono" value={audioUrl} onChange={(e) => setAudioUrl(e.target.value)} placeholder="URL MP3" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted uppercase">Tóm tắt</label>
                    <textarea rows={2} value={summary} onChange={(e) => setSummary(e.target.value)} className="w-full text-xs" />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted uppercase">
                      Toàn văn {chapters.length > 1 ? "(tự ghép từ các chương)" : "*"}
                    </label>
                    {chapters.length > 1 ? (
                      <p className="text-[10px] text-muted rounded-lg border border-border bg-muted/20 px-3 py-2">
                        Đang dùng {chapters.length} chương — sửa nội dung (có format Word) ở tab <strong>Chương / Phẩm</strong>.
                      </p>
                    ) : (
                      <RichTextEditor
                        key={`body-${activeItem?.id || "new"}`}
                        value={body}
                        onChange={setBody}
                        placeholder="Soạn toàn văn kinh… (in đậm, thụt dòng, căn lề như Word)"
                        minHeight="280px"
                      />
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted uppercase">Trạng thái</label>
                    <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full text-xs">
                      <option value="draft">Bản nháp</option>
                      <option value="pending">Chờ duyệt</option>
                      <option value="published">Xuất bản</option>
                      <option value="hidden">Ẩn</option>
                    </select>
                  </div>

                  {error && <div className="p-3 bg-red-50 text-red-700 text-xs font-medium rounded">{error}</div>}

                  <div className="flex justify-end gap-2 border-t border-border pt-4">
                    <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 border border-border rounded-lg text-xs font-semibold">
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={loading || !!uploading}
                      className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg text-xs disabled:opacity-50"
                    >
                      {loading ? "Đang lưu..." : "Lưu thông tin kinh"}
                    </button>
                  </div>
                </form>
              )}

              {activeTab === "chapters" && activeItem?.id && (() => {
                const activeIndex = chapters.findIndex((ch, i) => chapterKey(ch, i) === activeChapterKey);
                const activeCh = activeIndex >= 0 ? chapters[activeIndex] : null;
                const isNew = activeChapterKey === "new" || (!activeCh && chapters.length === 0);

                // Nhóm tab theo Tập (giữ thứ tự chương)
                type VolGroup = { volume: string; items: { ch: Chapter; index: number }[] };
                const volGroups: VolGroup[] = [];
                const volMap = new Map<string, VolGroup>();
                chapters.forEach((ch, index) => {
                  const vol = (ch.volume_title || "").trim() || "(Chưa gán tập)";
                  if (!volMap.has(vol)) {
                    const g = { volume: vol, items: [] as { ch: Chapter; index: number }[] };
                    volMap.set(vol, g);
                    volGroups.push(g);
                  }
                  volMap.get(vol)!.items.push({ ch, index });
                });

                return (
                  <div className="space-y-3">
                    <p className="text-[11px] text-muted">
                      Phân tầng như kinh truyền thống: <strong>Tập / Quyển → Chương / Phẩm</strong>.
                      Gán tên tập (vd. &quot;Tập 1&quot;, &quot;Quyển Thượng&quot;) — để trống nếu kinh không chia tập.
                      Mỗi chương một tab; editor giống Word.
                    </p>

                    {chapterNotice && (
                      <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800">{chapterNotice}</div>
                    )}
                    {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}

                    {/* Tab strip — nhóm theo Tập */}
                    <div className="space-y-2 border-b border-border pb-0">
                      {volGroups.map((g) => (
                        <div key={g.volume}>
                          <p className="mb-1 px-1 text-[10px] font-bold uppercase tracking-wide text-muted">
                            {g.volume}
                          </p>
                          <div className="flex items-center gap-1 overflow-x-auto">
                            {g.items.map(({ ch, index }) => {
                              const key = chapterKey(ch, index);
                              const selected = activeChapterKey === key;
                              return (
                                <button
                                  key={key}
                                  type="button"
                                  onClick={() => setActiveChapterKey(key)}
                                  title={ch.title || `Chương ${index + 1}`}
                                  className={`shrink-0 max-w-[11rem] truncate rounded-t-lg border border-b-0 px-3 py-2 text-[11px] font-bold transition-colors ${
                                    selected
                                      ? "border-primary/40 bg-card text-primary shadow-sm"
                                      : "border-transparent bg-muted/30 text-muted hover:bg-muted/50 hover:text-foreground"
                                  }`}
                                >
                                  <span className="mr-1 text-[10px] opacity-60">{index + 1}.</span>
                                  {ch.title || `Chương ${index + 1}`}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                      <div className="flex">
                        <button
                          type="button"
                          onClick={() => setActiveChapterKey("new")}
                          className={`shrink-0 inline-flex items-center gap-1 rounded-t-lg border border-b-0 px-3 py-2 text-[11px] font-bold transition-colors ${
                            isNew
                              ? "border-primary/40 bg-primary/5 text-primary"
                              : "border-transparent text-primary hover:bg-primary/10"
                          }`}
                        >
                          <Plus size={12} /> Thêm chương
                        </button>
                      </div>
                    </div>

                    {/* Editor pane — 1 chương đang chọn */}
                    {activeCh && activeIndex >= 0 && (
                      <div className="space-y-3 rounded-b-xl rounded-tr-xl border border-border bg-card p-3">
                        <div className="grid gap-2 sm:grid-cols-2">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-muted">Tập / Quyển</label>
                            <input
                              className="w-full text-xs"
                              list="volume-suggestions"
                              value={activeCh.volume_title || ""}
                              onChange={(e) => {
                                const next = [...chapters];
                                next[activeIndex] = { ...activeCh, volume_title: e.target.value };
                                setChapters(next);
                              }}
                              placeholder='Vd. "Tập 1" — để trống nếu không chia tập'
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-muted">Chương / Phẩm</label>
                            <input
                              className="w-full text-sm font-semibold"
                              value={activeCh.title}
                              onChange={(e) => {
                                const next = [...chapters];
                                next[activeIndex] = { ...activeCh, title: e.target.value };
                                setChapters(next);
                              }}
                              placeholder="Ví dụ: Phẩm 1 – Tựa đề"
                            />
                          </div>
                        </div>
                        <datalist id="volume-suggestions">
                          {knownVolumes.map((v) => (
                            <option key={v} value={v} />
                          ))}
                          <option value="Tập 1" />
                          <option value="Tập 2" />
                          <option value="Quyển Thượng" />
                          <option value="Quyển Trung" />
                          <option value="Quyển Hạ" />
                        </datalist>
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            disabled={chapterLoading || !activeCh.id}
                            onClick={() => handleSaveChapter(activeCh, activeIndex)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50"
                          >
                            {chapterLoading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                            Lưu chương
                          </button>
                          <button
                            type="button"
                            disabled={chapterLoading || !activeCh.id}
                            onClick={() => void handleDeleteChapter(activeCh, activeIndex)}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-2 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
                            title="Xóa chương"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <RichTextEditor
                          key={`ch-editor-${chapterKey(activeCh, activeIndex)}`}
                          value={activeCh.body}
                          onChange={(html) => {
                            const next = [...chapters];
                            next[activeIndex] = { ...activeCh, body: html };
                            setChapters(next);
                          }}
                          placeholder="Soạn nội dung chương như Word… (Ctrl+B đậm, Tab thụt dòng, dán từ Word được)"
                          minHeight="280px"
                        />
                      </div>
                    )}

                    {isNew && (
                      <div className="space-y-3 rounded-b-xl rounded-tr-xl border border-dashed border-primary/40 bg-primary/5 p-3">
                        <p className="text-xs font-bold text-primary">Thêm chương / phẩm mới</p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-muted">Tập / Quyển (tuỳ chọn)</label>
                            <input
                              className="w-full text-xs"
                              list="volume-suggestions-new"
                              placeholder='Vd. "Tập 1"'
                              value={newChVolume}
                              onChange={(e) => setNewChVolume(e.target.value)}
                            />
                            <datalist id="volume-suggestions-new">
                              {knownVolumes.map((v) => (
                                <option key={v} value={v} />
                              ))}
                              <option value="Tập 1" />
                              <option value="Tập 2" />
                              <option value="Quyển Thượng" />
                              <option value="Quyển Trung" />
                              <option value="Quyển Hạ" />
                            </datalist>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-muted">Chương / Phẩm *</label>
                            <input
                              className="w-full text-sm font-semibold"
                              placeholder="Ví dụ: Phẩm 1 – Tựa đề kinh"
                              value={newChTitle}
                              onChange={(e) => setNewChTitle(e.target.value)}
                            />
                          </div>
                        </div>
                        <RichTextEditor
                          key="new-chapter-editor"
                          value={newChBody}
                          onChange={setNewChBody}
                          placeholder="Nội dung phẩm mới… (editor giống Word)"
                          minHeight="220px"
                        />
                        <button
                          type="button"
                          disabled={chapterLoading}
                          onClick={() => void handleAddChapter()}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50"
                        >
                          {chapterLoading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                          Tạo chương
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}

              {activeTab === "audit" && activeItem?.id && <AuditTab module="sutras" entityId={activeItem.id} />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
