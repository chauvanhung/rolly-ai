"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { DollarSign, CheckCircle2 } from "lucide-react";
import { api } from "@/services/api";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import { PageLoading } from "@/components/ui/Skeleton";

export default function CharityPage() {
  const [charities, setCharities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadCharities = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api("/public/charities");
      setCharities(data || []);
    } catch (err: any) {
      setError(err?.message || "Không tải được chương trình thiện nguyện.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCharities();
  }, [loadCharities]);

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "planning": return "Đang lập kế hoạch";
      case "active": return "Đang quyên góp & thực hiện";
      case "completed": return "Đã hoàn thành";
      case "closed": return "Đã khóa đóng góp";
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-900/50";
      case "completed": return "bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/50";
      default: return "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-border";
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 space-y-10 fade-in">
      <PageHeader
        title="Hoạt Động Thiện Nguyện"
        description="Chung tay chia sẻ khó khăn với đồng bào vùng sâu vùng xa qua các chương trình minh bạch, tự nguyện từ tâm."
      />

      {loading ? (
        <PageLoading label="Đang tổng hợp báo cáo..." />
      ) : error ? (
        <EmptyState title="Lỗi tải dữ liệu" description={error} onRetry={loadCharities} />
      ) : charities.length === 0 ? (
        <EmptyState
          title="Chưa có chương trình"
          description="Đạo tràng hiện chưa có chương trình từ thiện mới nào. Xin vui lòng quay lại sau."
        />
      ) : (
        <div className="space-y-12">
          {charities.map((item) => {
            const income = Number(item.total_income || 0);
            const expense = Number(item.total_expense || 0);
            const percent = income > 0 ? Math.min(Math.round((expense / income) * 100), 100) : 0;
            
            return (
              <div
                key={item.id}
                className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:border-primary/10 transition-all flex flex-col md:flex-row"
              >
                {/* Visual Cover placeholder */}
                <div className="w-full md:w-56 shrink-0 bg-muted border-r border-border flex items-center justify-center p-8 relative">
                  <span className="text-5xl text-primary/10 select-none">☸</span>
                </div>

                {/* Details */}
                <div className="p-6 flex-grow space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2">
                    <h3 className="font-serif text-base font-bold text-foreground">{item.title}</h3>
                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border ${getStatusColor(item.program_status)}`}>
                      {getStatusLabel(item.program_status)}
                    </span>
                  </div>

                  <p className="text-xs text-muted leading-relaxed">{item.description}</p>
                  
                  {item.progress_note && (
                    <div className="bg-background/80 border border-border rounded-lg p-3 text-xs text-muted">
                      <span className="font-bold text-foreground block mb-1">Cập nhật tiến độ:</span>
                      <p>{item.progress_note}</p>
                    </div>
                  )}

                  {/* Financial Report Box */}
                  <div className="space-y-2 border-t border-border/20 pt-4">
                    <span className="text-xs font-bold text-foreground font-serif block">Báo cáo tài chính chi tiết:</span>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="flex items-center space-x-2 text-muted">
                        <DollarSign size={14} className="text-primary" />
                        <span>Tổng thu đóng góp: <strong className="text-foreground">{income.toLocaleString("vi-VN")} đ</strong></span>
                      </div>
                      <div className="flex items-center space-x-2 text-muted">
                        <CheckCircle2 size={14} className="text-calm" />
                        <span>Đã chi khai triển: <strong className="text-foreground">{expense.toLocaleString("vi-VN")} đ</strong></span>
                      </div>
                    </div>

                    {/* Progress Chart */}
                    <div className="space-y-1 pt-1">
                      <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
                        <div className="h-full bg-calm" style={{ width: `${percent}%` }} />
                      </div>
                      <span className="text-[10px] text-muted-foreground block text-right font-mono">Tiến trình triển khai: {percent}%</span>
                    </div>
                  </div>

                  {item.report && (
                    <div className="text-xs text-muted border-t border-border/10 pt-3 italic">
                      <span className="font-semibold text-foreground not-italic block mb-0.5">Báo cáo tổng kết:</span>
                      <p>{item.report}</p>
                    </div>
                  )}

                  <div className="pt-2">
                    <Link
                      href="/contact"
                      className="inline-flex items-center text-xs font-bold bg-primary text-primary-foreground px-4 py-2.5 rounded-full hover:bg-primary/95 transition-colors min-h-10"
                    >
                      Liên hệ đóng góp / công đức
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
