"use client";

import React, { useState, useEffect } from "react";
import { api, exportUrl } from "../services/api";
import { Search, RotateCw, Download, Plus, Eye, Pencil, Upload, Trash2, ShieldCheck, Loader2 } from "lucide-react";

interface Column {
  key: string;
  label: string;
  render?: (item: any) => React.ReactNode;
}

interface GenericAdminTableProps {
  module: string;
  label: string; // e.g. "bài kinh"
  columns: Column[];
  searchPlaceholder?: string;
  hasStatusFilter?: boolean;
  canPublish?: boolean;
  canRestore?: boolean;
  onEdit?: (item: any) => void;
  onView?: (item: any) => void;
  onAddNew?: () => void;
  refreshTrigger?: number;
}

export default function GenericAdminTable({
  module,
  label,
  columns,
  searchPlaceholder = "Tìm kiếm...",
  hasStatusFilter = true,
  canPublish = true,
  canRestore = true,
  onEdit,
  onView,
  onAddNew,
  refreshTrigger = 0,
}: GenericAdminTableProps) {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [onlyDeleted, setOnlyDeleted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Selection states
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Load items from API
  const loadData = async (nextPage = page) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        page_size: String(pageSize),
        sort: "-created_at",
      });
      if (search.trim()) params.set("search", search.trim());
      if (status) params.set("status", status);
      if (onlyDeleted) params.set("only_deleted", "true");
      
      const res = await api(`/${module}?` + params.toString());
      setItems(res.items || []);
      setTotal(res.total || 0);
      setPage(res.page || 1);
    } catch (err: any) {
      setError(err.message || "Lỗi tải dữ liệu.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(1);
    setSelectedIds([]);
  }, [status, onlyDeleted, refreshTrigger, module]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      loadData(1);
    }
  };

  // Row selection helpers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(items.map((x) => x.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((x) => x !== id));
    }
  };

  // Single Action Triggers
  const triggerPublish = async (id: number) => {
    try {
      await api(`/${module}/${id}/publish`, { method: "POST" });
      loadData(page);
    } catch (err: any) {
      alert(err.message || "Lỗi phê duyệt xuất bản.");
    }
  };

  const triggerDelete = async (id: number) => {
    if (!confirm(`Bạn có chắc muốn xóa mềm ${label} này (đưa vào thùng rác)?`)) return;
    try {
      await api(`/${module}/${id}`, { method: "DELETE" });
      loadData(page);
    } catch (err: any) {
      alert(err.message || "Lỗi xóa dữ liệu.");
    }
  };

  const triggerRestore = async (id: number) => {
    try {
      await api(`/${module}/${id}/restore`, { method: "POST" });
      loadData(page);
    } catch (err: any) {
      alert(err.message || "Lỗi khôi phục dữ liệu.");
    }
  };

  const triggerHardDelete = async (id: number) => {
    if (!confirm(`CẢNH BÁO: Hành động này sẽ XÓA VĨNH VIỄN ${label} và không thể hoàn tác! Bạn vẫn muốn tiếp tục?`)) return;
    try {
      await api(`/${module}/${id}/hard`, { method: "DELETE" });
      loadData(page);
    } catch (err: any) {
      alert(err.message || "Lỗi xóa vĩnh viễn.");
    }
  };

  // Bulk Actions
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Bạn có chắc muốn xóa mềm ${selectedIds.length} ${label} đã chọn?`)) return;
    try {
      await api(`/${module}/bulk/delete`, {
        method: "POST",
        body: JSON.stringify({ ids: selectedIds }),
      });
      setSelectedIds([]);
      loadData(1);
    } catch (err: any) {
      alert(err.message || "Lỗi xóa hàng loạt.");
    }
  };

  const pages = Math.max(1, Math.ceil(total / pageSize));

  // Status badge formatter
  const renderStatus = (statusVal: string, isDeleted: boolean) => {
    if (isDeleted) {
      return (
        <span className="inline-flex items-center rounded-full bg-red-50 dark:bg-red-950/30 px-2 py-0.5 text-xs font-semibold text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/50">
          Đã xóa
        </span>
      );
    }
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      draft: { bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-700 dark:text-gray-300", label: "Bản nháp" },
      pending: { bg: "bg-blue-100 dark:bg-blue-950/30", text: "text-blue-700 dark:text-blue-300", label: "Chờ duyệt" },
      published: { bg: "bg-green-100 dark:bg-green-950/30", text: "text-green-700 dark:text-green-300", label: "Xuất bản" },
      hidden: { bg: "bg-slate-100 dark:bg-slate-800", text: "text-slate-700 dark:text-slate-300", label: "Đã ẩn" },
    };
    const b = badges[statusVal] || { bg: "bg-border", text: "text-muted", label: statusVal };
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${b.bg} ${b.text}`}>
        {b.label}
      </span>
    );
  };

  return (
    <div className="w-full space-y-4 fade-in">
      {/* Search and Filters Toolbar */}
      <section className="flex flex-wrap items-center gap-3 p-4 bg-card border border-border rounded-xl shadow-sm">
        {/* Search input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-2.5 text-muted-foreground" size={18} />
          <input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="w-full pl-10 pr-4 py-2 border border-border bg-background rounded-md text-sm focus:border-primary"
          />
        </div>

        {/* Status Dropdown */}
        {hasStatusFilter && !onlyDeleted && (
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border border-border bg-background rounded-md px-3 py-2 text-sm focus:border-primary outline-none"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="draft">Bản nháp</option>
            <option value="pending">Chờ duyệt</option>
            <option value="published">Đã xuất bản</option>
            <option value="hidden">Đã ẩn</option>
          </select>
        )}

        {/* Trash Toggle */}
        {canRestore && (
          <label className="flex items-center space-x-2 text-sm text-muted cursor-pointer font-medium select-none hover:text-foreground transition-colors">
            <input
              type="checkbox"
              checked={onlyDeleted}
              onChange={(e) => {
                setOnlyDeleted(e.target.checked);
                setStatus("");
              }}
              className="rounded accent-primary border-border bg-background"
            />
            <span>Thùng rác</span>
          </label>
        )}

        {/* Tool actions */}
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => loadData(1)}
            className="flex items-center space-x-1.5 border border-border text-muted bg-background hover:text-foreground hover:bg-muted-foreground/10 px-3 py-2 rounded-md text-sm font-semibold transition-colors"
            title="Tải lại danh sách"
          >
            <RotateCw size={15} />
            <span>Nạp lại</span>
          </button>

          <a
            href={exportUrl(`/${module}/export/csv`)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center space-x-1.5 border border-border text-muted bg-background hover:text-foreground hover:bg-muted-foreground/10 px-3 py-2 rounded-md text-sm font-semibold transition-colors"
            title="Xuất danh sách ra tệp CSV"
          >
            <Download size={15} />
            <span>Xuất CSV</span>
          </a>

          {onAddNew && !onlyDeleted && (
            <button
              onClick={onAddNew}
              className="flex items-center space-x-1 bg-primary text-primary-foreground hover:bg-primary/95 px-4 py-2 rounded-md text-sm font-semibold transition-colors"
            >
              <Plus size={16} />
              <span>Thêm mới</span>
            </button>
          )}
        </div>
      </section>

      {/* Bulk actions status panel */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-lg text-sm text-foreground fade-in">
          <span className="font-medium">Đang chọn: {selectedIds.length} dòng dữ liệu</span>
          <div className="flex items-center space-x-2">
            {!onlyDeleted ? (
              <button
                onClick={handleBulkDelete}
                className="flex items-center space-x-1 text-xs font-semibold bg-red-600 text-white hover:bg-red-500 px-3 py-1.5 rounded-md transition-colors"
              >
                <Trash2 size={13} />
                <span>Xóa hàng loạt</span>
              </button>
            ) : null}
            <button
              onClick={() => setSelectedIds([])}
              className="text-xs font-semibold border border-border bg-card text-muted hover:text-foreground px-3 py-1.5 rounded-md transition-colors"
            >
              Hủy chọn
            </button>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/30 rounded-lg text-sm text-center">{error}</div>}

      {/* Grid/Table Data Panel */}
      <section className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead>
              <tr className="bg-border/5 text-muted-foreground">
                <th className="w-12 text-center py-3 px-4">
                  <input
                    type="checkbox"
                    checked={items.length > 0 && selectedIds.length === items.length}
                    onChange={handleSelectAll}
                    className="rounded accent-primary"
                  />
                </th>
                {columns.map((col) => (
                  <th key={col.key} className="py-3 px-4 font-semibold text-sm">
                    {col.label}
                  </th>
                ))}
                {hasStatusFilter && <th className="py-3 px-4 font-semibold text-sm">Trạng thái</th>}
                <th className="py-3 px-4 font-semibold text-sm text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={columns.length + (hasStatusFilter ? 3 : 2)} className="text-center py-12 text-muted">
                    <div className="flex items-center justify-center space-x-2">
                      <Loader2 className="animate-spin text-primary" size={20} />
                      <span className="text-sm font-medium">Đang truy lục dữ liệu...</span>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + (hasStatusFilter ? 3 : 2)} className="text-center py-12 text-muted-foreground text-sm font-medium">
                    Không tìm thấy dữ liệu phù hợp.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className={`hover:bg-border/5 transition-colors ${item.is_deleted ? "opacity-60 bg-red-50/5 dark:bg-red-950/5" : ""}`}>
                    {/* Checkbox */}
                    <td className="text-center py-3 px-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(item.id)}
                        onChange={(e) => handleSelectRow(item.id, e.target.checked)}
                        className="rounded accent-primary"
                      />
                    </td>
                    
                    {/* Render Columns */}
                    {columns.map((col) => (
                      <td key={col.key} className="py-3 px-4 font-medium text-foreground">
                        {col.render ? col.render(item) : item.data?.[col.key] ?? item[col.key] ?? "—"}
                      </td>
                    ))}
                    
                    {/* Status Badge */}
                    {hasStatusFilter && (
                      <td className="py-3 px-4">
                        {renderStatus(item.data?.status ?? item.status ?? "draft", item.is_deleted)}
                      </td>
                    )}
                    
                    {/* Action buttons */}
                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      {onView && (
                        <button
                          onClick={() => onView(item)}
                          className="p-1.5 rounded text-muted hover:text-foreground hover:bg-muted-foreground/10 transition-colors"
                          title="Xem chi tiết"
                        >
                          <Eye size={15} />
                        </button>
                      )}
                      
                      {!item.is_deleted ? (
                        <>
                          {onEdit && (
                            <button
                              onClick={() => onEdit(item)}
                              className="p-1.5 rounded text-muted hover:text-primary hover:bg-primary/10 transition-colors"
                              title="Chỉnh sửa"
                            >
                              <Pencil size={15} />
                            </button>
                          )}
                          {canPublish && (item.data?.status !== "published" && item.status !== "published") && (
                            <button
                              onClick={() => triggerPublish(item.id)}
                              className="p-1.5 rounded text-muted hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950/20 transition-colors"
                              title="Duyệt xuất bản"
                            >
                              <Upload size={15} />
                            </button>
                          )}
                          <button
                            onClick={() => triggerDelete(item.id)}
                            className="p-1.5 rounded text-muted hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                            title="Xóa mềm (Thùng rác)"
                          >
                            <Trash2 size={15} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => triggerRestore(item.id)}
                            className="px-2 py-1 text-xs font-semibold border border-primary text-primary hover:bg-primary hover:text-primary-foreground rounded transition-colors"
                          >
                            Khôi phục
                          </button>
                          <button
                            onClick={() => triggerHardDelete(item.id)}
                            className="p-1.5 rounded text-muted hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                            title="Xóa vĩnh viễn (Chỉ Super Admin)"
                          >
                            <Trash2 size={15} />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {pages > 1 && (
          <div className="flex items-center justify-between p-4 bg-border/5 border-t border-border text-sm text-muted-foreground">
            <span>Tổng số bản ghi: {total}</span>
            <div className="flex items-center space-x-3">
              <button
                disabled={page <= 1}
                onClick={() => loadData(page - 1)}
                className="px-3 py-1.5 border border-border rounded-md hover:text-foreground bg-card disabled:opacity-50 transition-colors"
              >
                Trước
              </button>
              <span className="font-mono text-foreground font-semibold">Trang {page} / {pages}</span>
              <button
                disabled={page >= pages}
                onClick={() => loadData(page + 1)}
                className="px-3 py-1.5 border border-border rounded-md hover:text-foreground bg-card disabled:opacity-50 transition-colors"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
