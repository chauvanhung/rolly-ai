"use client";

import React, { useState, useEffect } from "react";
import { api, getApiUrl } from "@/services/api";
import { Upload, Search, Copy, Check, Trash2, Image as ImageIcon, FileText, Music, Video, Loader2 } from "lucide-react";

export default function AdminMediaPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  
  // Copy feedback state
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const loadAssets = async (nextPage = 1) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        page_size: "12",
        sort: "-created_at",
      });
      if (search.trim()) params.set("search", search.trim());
      // Lọc theo kind nếu cần
      const res = await api("/media_assets?" + params.toString());
      
      // Flatten GenericItem: { id: item.id, ...item.data }
      const flatItems = (res.items || []).map((item: any) => {
        if (item.data) {
          return { id: item.id, ...item.data };
        }
        return item;
      });

      // Client-side filter for kind if selected
      const filtered = kindFilter 
        ? flatItems.filter((x: any) => x.kind === kindFilter) 
        : flatItems;

      setAssets(filtered);
      setTotal(res.total || 0);
      setPage(nextPage);
    } catch (err: any) {
      setError(err.message || "Lỗi tải thư viện media.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssets(1);
  }, [kindFilter]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      loadAssets(1);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setUploading(true);
    setError("");
    try {
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append("file", files[i]);

        // POST /api/v1/media_assets/upload
        await api("/media_assets/upload", {
          method: "POST",
          body: formData,
        });
      }
      loadAssets(1);
    } catch (err: any) {
      setError(err.message || "Lỗi tải tệp lên máy chủ.");
    } finally {
      setUploading(false);
      // Clear input
      e.target.value = "";
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn tệp "${name}"?`)) return;
    try {
      // Hard delete for media assets directly
      await api(`/media_assets/${id}/hard`, { method: "DELETE" });
      loadAssets(page);
    } catch (err: any) {
      alert(err.message || "Lỗi xóa tệp.");
    }
  };

  const copyToClipboard = (url: string, id: number) => {
    // Resolve absolute URL
    const baseUrl = getApiUrl().replace("/api/v1", "");
    const absoluteUrl = `${baseUrl}${url}`;
    navigator.clipboard.writeText(absoluteUrl);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getFileIcon = (kind: string) => {
    switch (kind) {
      case "pdf":
        return <FileText className="text-red-500 w-10 h-10" />;
      case "audio":
        return <Music className="text-blue-500 w-10 h-10" />;
      case "video":
        return <Video className="text-green-500 w-10 h-10" />;
      default:
        return <ImageIcon className="text-muted-foreground w-10 h-10" />;
    }
  };

  return (
    <div className="space-y-6 fade-in">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground">Thư Viện Hình Ảnh & Media</h1>
          <p className="text-xs text-muted font-medium">Tải lên biểu ngữ (banner), ảnh đại diện kinh điển, tài liệu PDF hoặc file âm thanh pháp thoại.</p>
        </div>
      </header>

      {/* Upload Zone & Filter Toolbar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left: Upload Card */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col items-center justify-center text-center space-y-4 min-h-[200px]">
          <div className="p-4 bg-primary/5 rounded-full border border-primary/10">
            {uploading ? (
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
            ) : (
              <Upload className="w-10 h-10 text-primary" />
            )}
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-sm text-foreground">Tải tệp mới lên hệ thống</h3>
            <p className="text-xs text-muted-foreground max-w-[200px] mx-auto">Hỗ trợ định dạng hình ảnh JPG, PNG, PDF hoặc tệp âm thanh MP3.</p>
          </div>
          <label className="cursor-pointer bg-primary text-primary-foreground font-bold hover:bg-primary/95 text-xs px-4 py-2 rounded-lg transition-all shadow-sm">
            <span>Chọn tệp tin...</span>
            <input
              type="file"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              disabled={uploading}
            />
          </label>
        </div>

        {/* Right: Search & Filters (span 2) */}
        <div className="md:col-span-2 bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <h3 className="font-serif text-sm font-bold text-foreground">Tìm kiếm & Phân loại</h3>
            
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 text-muted-foreground" size={18} />
                <input
                  placeholder="Tìm kiếm tên tệp..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  className="w-full pl-10 pr-4 py-2 border border-border bg-background rounded-md text-sm focus:border-primary"
                />
              </div>

              {/* Type Filter */}
              <select
                value={kindFilter}
                onChange={(e) => setKindFilter(e.target.value)}
                className="border border-border bg-background rounded-md px-3 py-2 text-sm focus:border-primary outline-none"
              >
                <option value="">Tất cả định dạng</option>
                <option value="image">Hình ảnh (Image)</option>
                <option value="pdf">Tài liệu (PDF)</option>
                <option value="audio">Âm thanh (Audio)</option>
                <option value="video">Phim (Video)</option>
              </select>
            </div>
          </div>

          <div className="text-xs text-muted leading-relaxed pt-2 border-t border-border/40">
            <span className="font-semibold text-primary">💡 Hướng dẫn sử dụng:</span> Sau khi tải ảnh hoặc banner lên, nhấn nút <strong>"Sao chép đường dẫn"</strong>. Đường dẫn sẽ được tự động sao chép vào khay nhớ tạm để bạn dán vào trường <strong>"Hình nền / Cover URL"</strong> khi tạo mới bài kinh, bài giảng hoặc sự kiện Phật sự.
          </div>
        </div>

      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 text-xs rounded border border-red-200 text-center">
          {error}
        </div>
      )}

      {/* Media Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted space-y-2">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <span className="text-sm font-medium">Đang truy lục thư viện...</span>
        </div>
      ) : assets.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border rounded-xl text-muted">
          Thư viện trống hoặc không tìm thấy tệp phù hợp.
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
            {assets.map((asset) => (
              <div key={asset.id} className="group relative bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:border-primary/20 transition-all flex flex-col justify-between">
                
                {/* Preview Box */}
                <div className="aspect-square bg-muted flex items-center justify-center relative overflow-hidden">
                  {asset.kind === "image" ? (
                    <img
                      src={`${getApiUrl().replace("/api/v1", "")}${asset.url}`}
                      alt={asset.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                      loading="lazy"
                    />
                  ) : asset.kind === "audio" ? (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-3">
                      {getFileIcon(asset.kind)}
                      <audio
                        controls
                        preload="metadata"
                        className="w-full max-w-[90%] h-8"
                        src={asset.url?.startsWith("http") ? asset.url : asset.url}
                      >
                        <track kind="captions" />
                      </audio>
                    </div>
                  ) : (
                    getFileIcon(asset.kind)
                  )}
                  
                  {/* Overlay details */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3 text-white">
                    <span className="text-[10px] truncate block font-semibold">{asset.file_name}</span>
                    <span className="text-[9px] text-gray-300 block">{Math.round(asset.size_bytes / 1024)} KB</span>
                  </div>
                </div>

                {/* Info & Action Buttons */}
                <div className="p-3 space-y-2 border-t border-border">
                  <span className="text-[10px] font-bold text-foreground line-clamp-1 block" title={asset.title}>
                    {asset.title || asset.file_name}
                  </span>

                  <div className="flex justify-between items-center gap-1.5 pt-1.5 border-t border-border/40">
                    <button
                      onClick={() => copyToClipboard(asset.url, asset.id)}
                      className={`flex-1 flex items-center justify-center space-x-1 py-1.5 rounded text-[10px] font-bold transition-all ${
                        copiedId === asset.id
                          ? "bg-green-100 text-green-800"
                          : "bg-primary/5 hover:bg-primary/10 text-primary"
                      }`}
                    >
                      {copiedId === asset.id ? (
                        <>
                          <Check size={12} />
                          <span>Đã chép!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          <span>Chép URL</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(asset.id, asset.file_name)}
                      className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded transition-all"
                      title="Xóa tệp vĩnh viễn"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

              </div>
            ))}
          </div>

          {/* Pagination */}
          {total > 12 && (
            <div className="flex justify-center items-center space-x-3 pt-6 border-t border-border/40">
              <button
                onClick={() => loadAssets(page - 1)}
                disabled={page === 1}
                className="px-3 py-1.5 bg-card border border-border rounded text-xs font-bold hover:bg-muted/10 disabled:opacity-40 disabled:hover:bg-card transition-all"
              >
                Trước
              </button>
              <span className="text-xs font-semibold text-muted-foreground">
                Trang {page} / {Math.ceil(total / 12)}
              </span>
              <button
                onClick={() => loadAssets(page + 1)}
                disabled={page * 12 >= total}
                className="px-3 py-1.5 bg-card border border-border rounded text-xs font-bold hover:bg-muted/10 disabled:opacity-40 disabled:hover:bg-card transition-all"
              >
                Sau
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
