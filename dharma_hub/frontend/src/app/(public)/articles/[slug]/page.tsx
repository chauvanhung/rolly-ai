"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { api } from "@/services/api";
import { useAuth } from "@/context/AppContext";
import ReadingView from "@/components/ReadingView";

interface Params {
  slug: string;
}

export default function ArticleDetailPage({ params }: { params: Promise<Params> }) {
  const { slug } = use(params);
  const { user } = useAuth();
  const [talk, setTalk] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Bookmark state
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);

  useEffect(() => {
    async function loadTalkData() {
      setLoading(true);
      setError("");
      try {
        const data = await api(`/public/articles/${slug}`);
        setTalk(data);
        
        // Check if bookmarked
        if (user) {
          try {
            const bookmarks = await api("/user/bookmarks");
            const bookmarked = bookmarks.some(
              (b: any) => b.item_type === "dharma_talk" && b.item_id === data.id
            );
            setIsBookmarked(bookmarked);
          } catch (bmErr) {
            console.error("Error checking bookmarks:", bmErr);
          }
        }
      } catch (err: any) {
        setError(err.message || "Không thể tải bài pháp.");
      } finally {
        setLoading(false);
      }
    }
    loadTalkData();
  }, [slug, user]);

  const handleBookmarkToggle = async () => {
    if (!user) {
      alert("Quý Phật tử vui lòng đăng nhập tài khoản để sử dụng tính năng lưu bài pháp.");
      return;
    }
    setBookmarkLoading(true);
    try {
      if (isBookmarked) {
        await api(`/user/bookmarks/dharma_talk/${talk.id}`, { method: "DELETE" });
        setIsBookmarked(false);
      } else {
        await api("/user/bookmarks", {
          method: "POST",
          body: JSON.stringify({ item_type: "dharma_talk", item_id: talk.id }),
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
    // In our DB schema, reading progress covers Sutras.
    // For articles, we can log it or let it execute. Let's keep it local or sync if needed.
    console.log(`Article scroll progress: ${percent}%`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-muted">
        <Loader2 className="animate-spin mr-2 text-primary" size={24} />
        <span className="text-sm font-semibold">Đang truyền tải bài pháp...</span>
      </div>
    );
  }

  if (error || !talk) {
    return (
      <div className="mx-auto max-w-lg text-center py-20 space-y-4">
        <p className="text-red-500 text-sm font-semibold">{error || "Bài pháp không tồn tại."}</p>
        <Link href="/articles" className="inline-flex items-center text-sm font-bold text-primary hover:underline">
          <ArrowLeft size={16} className="mr-1" />
          <span>Quay lại danh sách</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Back link */}
      <div>
        <Link
          href="/articles"
          className="inline-flex items-center text-sm font-bold text-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft size={16} className="mr-1.5" />
          <span>Danh sách bài pháp</span>
        </Link>
      </div>

      {/* Reader */}
      <ReadingView
        title={talk.title}
        subtitle={talk.author ? `Giảng sư: ${talk.author.name} | Danh mục: Phật Pháp` : "Giáo lý tu học"}
        body={talk.body}
        itemType="dharma_talk"
        itemId={talk.id}
        sharePath={`/articles/${talk.slug}`}
        isBookmarked={isBookmarked}
        onBookmarkToggle={handleBookmarkToggle}
        onProgressSave={handleProgressSave}
      />
    </div>
  );
}
