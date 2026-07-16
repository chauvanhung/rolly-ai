"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Calendar, MapPin, ArrowRight } from "lucide-react";
import { api } from "@/services/api";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import { CardSkeleton } from "@/components/ui/Skeleton";
import MediaPlaceholder from "@/components/ui/MediaPlaceholder";

export default function RetreatsListPage() {
  const [retreats, setRetreats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadRetreats = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api("/public/retreats");
      setRetreats(data || []);
    } catch (err: any) {
      setError(err?.message || "Không tải được danh sách khóa tu.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRetreats();
  }, [loadRetreats]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("vi-VN", {
      day: "numeric",
      month: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8 space-y-10 fade-in">
      <PageHeader
        title="Khóa Tu Phật Giáo"
        description="Tham gia đăng ký các khóa tu gieo duyên xuất gia, thiền hành chánh niệm và khóa tu mùa hè dành cho giới trẻ."
      />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : error ? (
        <EmptyState title="Lỗi tải khóa tu" description={error} onRetry={loadRetreats} />
      ) : retreats.length === 0 ? (
        <EmptyState
          title="Chưa có khóa tu"
          description="Đạo tràng hiện chưa có lịch trình khóa tu học mới. Xin vui lòng quay lại sau."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {retreats.map((r) => (
            <div
              key={r.id}
              className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col justify-between shadow-sm hover:border-primary/20 transition-all"
            >
              <div>
                <MediaPlaceholder
                  variant="cover"
                  src={r.cover_url}
                  alt={r.title}
                  className="h-48 aspect-auto border-0 border-b rounded-none"
                  badge={
                    <span className="absolute top-4 right-4 rounded-full bg-background/90 text-[10px] px-2.5 py-1 font-bold border border-border">
                      {r.registration_open ? "Đang nhận hồ sơ" : "Đã khóa đăng ký"}
                    </span>
                  }
                />

                {/* Content */}
                <div className="p-6 space-y-4">
                  <h3 className="font-serif text-lg font-bold text-foreground">{r.title}</h3>
                  <p className="text-xs text-muted leading-relaxed line-clamp-3">{r.description || "Xem lịch trình tu học chi tiết và nội quy khóa tu..."}</p>

                  <div className="space-y-2 text-xs text-muted border-t border-border/20 pt-4">
                    <div className="flex items-center">
                      <Calendar size={14} className="mr-2 text-primary shrink-0" />
                      <span>Thời gian: {formatDate(r.start_at)} - {formatDate(r.end_at)}</span>
                    </div>
                    <div className="flex items-center">
                      <MapPin size={14} className="mr-2 text-primary shrink-0" />
                      <span>Địa điểm: {r.location || "Đang cập nhật"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Footer */}
              <div className="p-6 pt-0 border-t border-border/10 flex items-center justify-between text-xs mt-4 pt-4">
                <span className="text-muted-foreground">
                  Số lượng: {r.capacity ? `Chỉ nhận ${r.capacity} học viên` : "Không giới hạn"}
                </span>
                <Link
                  href={`/retreats/${r.slug}`}
                  className="flex items-center space-x-1 text-xs font-bold text-primary hover:underline bg-primary/5 hover:bg-primary hover:text-primary-foreground px-4 py-2 rounded-full transition-all"
                >
                  <span>Chi tiết & Đăng ký</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
