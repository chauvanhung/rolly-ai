"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Calendar, FileText, Pin } from "lucide-react";
import { api } from "@/services/api";
import RichTextContent from "@/components/RichTextContent";

interface Params {
  slug: string;
}

export default function NewsDetailPage({ params }: { params: Promise<Params> }) {
  const { slug } = use(params);
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadPost() {
      setLoading(true);
      setError("");
      try {
        const data = await api(`/public/news/${slug}`);
        setPost(data);
      } catch (err: any) {
        setError(err.message || "Không thể tải bài viết.");
      } finally {
        setLoading(false);
      }
    }
    loadPost();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-muted">
        <Loader2 className="animate-spin mr-2 text-primary" size={24} />
        <span className="text-sm font-semibold">Đang tải bản tin...</span>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="mx-auto max-w-lg text-center py-20 space-y-4">
        <p className="text-red-500 text-sm font-semibold">{error || "Bản tin không tồn tại."}</p>
        <Link href="/news" className="inline-flex items-center text-sm font-bold text-primary hover:underline">
          <ArrowLeft size={16} className="mr-1" />
          <span>Quay lại danh sách</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8 space-y-6 fade-in">
      {/* Back link */}
      <div>
        <Link
          href="/news"
          className="inline-flex items-center text-sm font-bold text-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft size={16} className="mr-1.5" />
          <span>Danh sách tin tức</span>
        </Link>
      </div>

      {/* Main post layout */}
      <article className="bg-card border border-border rounded-2xl p-6 sm:p-10 shadow-sm space-y-6">
        <header className="space-y-4 border-b border-border/40 pb-6 text-center">
          <div className="flex justify-center items-center space-x-2 text-xs text-muted-foreground">
            <span className="flex items-center">
              <Calendar size={13} className="mr-1 text-primary" />
              {new Date(post.created_at).toLocaleDateString("vi-VN")}
            </span>
            {post.is_pinned && (
              <span className="flex items-center text-primary font-bold space-x-0.5">
                <Pin size={12} />
                <span>Thông báo ghim</span>
              </span>
            )}
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-foreground leading-tight">{post.title}</h1>
        </header>

        {/* Content Body */}
        <div className="prose max-w-none text-sm text-[#1a1612] text-justify">
          <RichTextContent html={post.body} />
        </div>
        
        {/* Footer info */}
        <footer className="border-t border-border/30 pt-6 text-center text-xs text-muted-foreground/60 italic">
          <p>Thông tin chính thức phát hành từ Ban Trị Sự Đạo Tràng.</p>
        </footer>
      </article>
    </div>
  );
}
