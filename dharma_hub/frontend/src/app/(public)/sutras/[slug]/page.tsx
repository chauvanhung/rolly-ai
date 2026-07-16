"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Play } from "lucide-react";
import { api } from "@/services/api";
import { useAuth } from "@/context/AppContext";
import ReadingView from "@/components/ReadingView";
import AudioPlayer from "@/components/AudioPlayer";

interface Params {
  slug: string;
}

export default function SutraDetailPage({ params }: { params: Promise<Params> }) {
  const { slug } = use(params);
  const { user } = useAuth();
  const [sutra, setSutra] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Bookmark state
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);

  useEffect(() => {
    async function loadSutraData() {
      setLoading(true);
      setError("");
      try {
        const data = await api(`/public/sutras/${slug}`);
        setSutra(data);
        
        // If logged in, check if this sutra is bookmarked
        if (user) {
          try {
            const bookmarks = await api("/user/bookmarks");
            const bookmarked = bookmarks.some(
              (b: any) => b.item_type === "sutra" && b.item_id === data.id
            );
            setIsBookmarked(bookmarked);
          } catch (bmErr) {
            console.error("Error checking bookmarks:", bmErr);
          }
        }
      } catch (err: any) {
        setError(err.message || "Không thể tải kinh văn.");
      } finally {
        setLoading(false);
      }
    }
    loadSutraData();
  }, [slug, user]);

  const handleBookmarkToggle = async () => {
    if (!user) {
      alert("Quý Phật tử vui lòng đăng nhập tài khoản để sử dụng tính năng lưu kinh sách.");
      return;
    }
    setBookmarkLoading(true);
    try {
      if (isBookmarked) {
        // DELETE /api/v1/user/bookmarks/sutra/:id
        await api(`/user/bookmarks/sutra/${sutra.id}`, { method: "DELETE" });
        setIsBookmarked(false);
      } else {
        // POST /api/v1/user/bookmarks
        await api("/user/bookmarks", {
          method: "POST",
          body: JSON.stringify({ item_type: "sutra", item_id: sutra.id }),
        });
        setIsBookmarked(true);
      }
    } catch (err: any) {
      alert(err.message || "Lỗi thao tác bookmark.");
    } finally {
      setBookmarkLoading(false);
    }
  };

  const handleProgressSave = async (percent: number) => {
    if (!user || !sutra) return;
    try {
      // POST /api/v1/user/progress/reading
      await api("/user/progress/reading", {
        method: "POST",
        body: JSON.stringify({
          sutra_id: sutra.id,
          percent_complete: percent,
        }),
      });
    } catch (err) {
      // Silently fail as it is a background sync
      console.error("Error saving progress:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-muted">
        <Loader2 className="animate-spin mr-2 text-primary" size={24} />
        <span className="text-sm font-semibold">Đang cung nghinh kinh điển...</span>
      </div>
    );
  }

  if (error || !sutra) {
    return (
      <div className="mx-auto max-w-lg text-center py-20 space-y-4">
        <p className="text-red-500 text-sm font-semibold">{error || "Kinh văn không tồn tại."}</p>
        <Link href="/sutras" className="inline-flex items-center text-sm font-bold text-primary hover:underline">
          <ArrowLeft size={16} className="mr-1" />
          <span>Quay lại thư viện</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Back link button */}
      <div>
        <Link
          href="/sutras"
          className="inline-flex items-center text-sm font-bold text-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft size={16} className="mr-1.5" />
          <span>Thư viện kinh điển</span>
        </Link>
      </div>

      {/* Embedded Audio Player if Chanting Audio URL exists */}
      {sutra.audio_url && (
        <div className="max-w-xl mx-auto">
          <AudioPlayer
            src={sutra.audio_url}
            title={`Bản âm tụng đọc: ${sutra.title}`}
            speaker={sutra.translator ? `Dịch giả: ${sutra.translator}` : "Thư viện âm thanh"}
          />
        </div>
      )}

      {/* Main Reading View Reader */}
      <ReadingView
        title={sutra.title}
        subtitle={sutra.sutra_group ? `Bộ nhóm: ${sutra.sutra_group} | Nguồn: ${sutra.source || "Pháp bảo"}` : undefined}
        body={sutra.body}
        chapters={sutra.chapters}
        itemType="sutra"
        itemId={sutra.id}
        sharePath={`/sutras/${sutra.slug}`}
        isBookmarked={isBookmarked}
        onBookmarkToggle={handleBookmarkToggle}
        onProgressSave={handleProgressSave}
      />
    </div>
  );
}
