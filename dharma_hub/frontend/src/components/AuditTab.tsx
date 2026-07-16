"use client";

import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { Loader2, History, ArrowRight, CornerDownRight } from "lucide-react";

interface AuditTabProps {
  module: string;
  entityId: number;
}

export default function AuditTab({ module, entityId }: AuditTabProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchAudit() {
      setLoading(true);
      setError("");
      try {
        // Path matches generic admin endpoint: GET /api/v1/:module/:entityId/audit
        const data = await api(`/${module}/${entityId}/audit`);
        setLogs(data.items || []);
      } catch (err: any) {
        setError(err.message || "Không thể tải lịch sử thay đổi.");
      } finally {
        setLoading(false);
      }
    }
    fetchAudit();
  }, [module, entityId]);

  // Helper to parse JSON safely
  const parseJson = (str: string | null) => {
    if (!str) return null;
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  };

  // Compare before and after objects and return key differences
  const getDiff = (beforeStr: string | null, afterStr: string | null) => {
    const before = parseJson(beforeStr) || {};
    const after = parseJson(afterStr) || {};
    const diffs: Array<{ key: string; oldVal: any; newVal: any }> = [];

    // Find keys to compare
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    
    // Ignore meta columns that are noise in diff comparisons
    const ignoredKeys = new Set([
      "created_at", "updated_at", "deleted_at", "id", 
      "hashed_password", "created_by", "updated_by", "deleted_by"
    ]);

    keys.forEach((k) => {
      if (ignoredKeys.has(k)) return;
      
      const vBefore = before[k];
      const vAfter = after[k];

      if (JSON.stringify(vBefore) !== JSON.stringify(vAfter)) {
        diffs.push({
          key: k,
          oldVal: vBefore,
          newVal: vAfter
        });
      }
    });

    return diffs;
  };

  const actionLabels: Record<string, string> = {
    create: "Khởi tạo mới",
    update: "Cập nhật dữ liệu",
    delete: "Xóa mềm (Thùng rác)",
    restore: "Khôi phục dữ liệu",
    publish: "Xuất bản công khai",
    hide: "Ẩn nội dung",
    hard_delete: "Xóa vật lý vĩnh viễn"
  };

  const actionColors: Record<string, string> = {
    create: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
    update: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
    delete: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
    restore: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
    publish: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    hide: "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300"
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted">
        <Loader2 className="animate-spin mr-2" size={18} />
        <span>Đang truy lục nhật ký thay đổi...</span>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 text-sm py-4 text-center">{error}</div>;
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm flex flex-col items-center">
        <History size={36} className="mb-2 text-muted-foreground/30" />
        <span>Chưa ghi nhận nhật ký chỉnh sửa nào cho nội dung này.</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-4">
      <h3 className="text-sm font-bold text-foreground font-serif border-b border-border pb-2 flex items-center">
        <History size={16} className="mr-1.5 text-primary" />
        <span>Lịch sử chỉnh sửa hệ thống ({logs.length})</span>
      </h3>

      <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
        {logs.map((log) => {
          const diff = getDiff(log.before_json, log.after_json);
          return (
            <div key={log.id} className="border border-border rounded-lg p-4 bg-background/50 hover:bg-background transition-colors">
              {/* Log Entry Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center space-x-2">
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${actionColors[log.action] || "bg-border text-muted"}`}>
                    {actionLabels[log.action] || log.action}
                  </span>
                  <span className="text-xs font-semibold text-foreground font-mono">
                    Người thực hiện: {log.actor_email || "Hệ thống"}
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground font-mono">
                  {new Date(log.created_at).toLocaleString("vi-VN")}
                </span>
              </div>

              {/* IP / User Agent */}
              {(log.ip_address || log.user_agent) && (
                <div className="text-[10px] text-muted-foreground/75 font-mono mb-2">
                  {log.ip_address && <span className="mr-3">IP: {log.ip_address}</span>}
                  {log.user_agent && <span className="truncate max-w-xs inline-block vertical-bottom">Thiết bị: {log.user_agent}</span>}
                </div>
              )}

              {/* Changes Diff Table */}
              {diff.length > 0 ? (
                <div className="mt-3 border border-border/55 rounded-md overflow-hidden bg-card/40">
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr className="bg-border/10 text-muted-foreground">
                        <th className="py-1 px-2 border-b border-border/40 font-medium">Trường dữ liệu</th>
                        <th className="py-1 px-2 border-b border-border/40 font-medium">Giá trị cũ</th>
                        <th className="py-1 px-2 border-b border-border/40 font-medium">Giá trị mới</th>
                      </tr>
                    </thead>
                    <tbody>
                      {diff.map((df) => (
                        <tr key={df.key} className="hover:bg-border/5">
                          <td className="py-1.5 px-2 font-semibold text-primary font-mono">{df.key}</td>
                          <td className="py-1.5 px-2 text-red-600 dark:text-red-400 max-w-[150px] truncate font-mono" title={String(df.oldVal)}>
                            {df.oldVal === null || df.oldVal === "" ? "— (rỗng)" : String(df.oldVal)}
                          </td>
                          <td className="py-1.5 px-2 text-green-600 dark:text-green-400 max-w-[150px] truncate font-mono" title={String(df.newVal)}>
                            {df.newVal === null || df.newVal === "" ? "— (xóa)" : String(df.newVal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : log.action === "update" ? (
                <p className="text-xs text-muted italic pl-4 flex items-center">
                  <CornerDownRight size={12} className="mr-1" />
                  <span>Dữ liệu lưu trữ không thay đổi (nhấn Lưu nhưng không sửa trường).</span>
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
