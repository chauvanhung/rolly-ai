"use client";

import React, { useState, useEffect, useRef, use } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, PlayCircle, Bookmark, FileText, Clock, Volume2, ChevronDown, ChevronUp } from "lucide-react";
import { api } from "@/services/api";
import { useAuth } from "@/context/AppContext";
import AudioPlayer from "@/components/AudioPlayer";

interface Params {
  slug: string;
}

export default function LectureDetailPage({ params }: { params: Promise<Params> }) {
  const { slug } = use(params);
  const { user } = useAuth();
  const [lecture, setLecture] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Collapsible transcript state
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  
  // Bookmark state
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  
  // Video player reference (for seeking YouTube or HTML5 video)
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    async function loadLectureData() {
      setLoading(true);
      setError("");
      try {
        const data = await api(`/public/lectures/${slug}`);
        setLecture(data);
        
        // Check if bookmarked
        if (user) {
          try {
            const bookmarks = await api("/user/bookmarks");
            const bookmarked = bookmarks.some(
              (b: any) => b.item_type === "lecture" && b.item_id === data.id
            );
            setIsBookmarked(bookmarked);
          } catch (bmErr) {
            console.error("Error checking bookmarks:", bmErr);
          }
        }
      } catch (err: any) {
        setError(err.message || "Không thể tải bài giảng.");
      } finally {
        setLoading(false);
      }
    }
    loadLectureData();
  }, [slug, user]);

  const handleBookmarkToggle = async () => {
    if (!user) {
      alert("Quý Phật tử vui lòng đăng nhập để lưu bài giảng vào danh sách nghe sau.");
      return;
    }
    setBookmarkLoading(true);
    try {
      if (isBookmarked) {
        await api(`/user/bookmarks/lecture/${lecture.id}`, { method: "DELETE" });
        setIsBookmarked(false);
      } else {
        await api("/user/bookmarks", {
          method: "POST",
          body: JSON.stringify({ item_type: "lecture", item_id: lecture.id }),
        });
        setIsBookmarked(true);
      }
    } catch (err: any) {
      alert(err.message || "Lỗi thao tác bookmark.");
    } finally {
      setBookmarkLoading(false);
    }
  };

  // Convert YouTube watch URL to embed URL
  const getYoutubeEmbedUrl = (url: string | null) => {
    if (!url) return "";
    let videoId = "";
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
      videoId = match[2];
    }
    return videoId ? `https://www.youtube.com/embed/${videoId}?enablejsapi=1` : url;
  };

  // Parse JSON Timestamps safely
  const getTimestamps = () => {
    if (!lecture || !lecture.timestamps_json) return [];
    try {
      return JSON.parse(lecture.timestamps_json);
    } catch {
      // Fallback if not JSON string
      return [];
    }
  };

  // Trigger media seeking when clicking a timestamp
  const handleTimestampClick = (seconds: number) => {
    // For YouTube iframe, we send postMessage command
    if (iframeRef.current) {
      iframeRef.current.contentWindow?.postMessage(
        JSON.stringify({
          event: "command",
          func: "seekTo",
          args: [seconds, true]
        }),
        "*"
      );
      iframeRef.current.contentWindow?.postMessage(
        JSON.stringify({
          event: "command",
          func: "playVideo",
          args: []
        }),
        "*"
      );
    }
  };

  const formatSeconds = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-muted">
        <Loader2 className="animate-spin mr-2 text-primary" size={24} />
        <span className="text-sm font-semibold">Đang truy lục bài giảng...</span>
      </div>
    );
  }

  if (error || !lecture) {
    return (
      <div className="mx-auto max-w-lg text-center py-20 space-y-4">
        <p className="text-red-500 text-sm font-semibold">{error || "Bài giảng không tồn tại."}</p>
        <Link href="/lectures" className="inline-flex items-center text-sm font-bold text-primary hover:underline">
          <ArrowLeft size={16} className="mr-1" />
          <span>Quay lại thư viện</span>
        </Link>
      </div>
    );
  }

  const isVideo = Boolean(lecture.video_url);
  const timestamps = getTimestamps();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 fade-in">
      {/* Back button */}
      <div>
        <Link
          href="/lectures"
          className="inline-flex items-center text-sm font-bold text-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft size={16} className="mr-1.5" />
          <span>Thư viện bài giảng</span>
        </Link>
      </div>

      {/* Main Grid: Player on left, Timestamps/Details on right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Player & Meta info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Responsive Player Frame */}
          {isVideo ? (
            <div className="w-full aspect-video rounded-xl overflow-hidden border border-border bg-black shadow-md relative">
              <iframe
                ref={iframeRef}
                src={getYoutubeEmbedUrl(lecture.video_url)}
                className="absolute top-0 left-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={lecture.title}
              />
            </div>
          ) : lecture.audio_url ? (
            <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
              <AudioPlayer
                src={lecture.audio_url}
                title={lecture.title}
                speaker={lecture.teacher?.name || "Giảng sư"}
              />
            </div>
          ) : (
            <div className="w-full aspect-video rounded-xl bg-muted border border-border flex items-center justify-center">
              <p className="text-sm text-muted">Bài giảng này hiện chưa có liên kết phát trực tuyến.</p>
            </div>
          )}

          {/* Title & Actions */}
          <div className="bg-card border border-border rounded-xl p-6 space-y-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h1 className="font-serif text-xl sm:text-2xl font-bold text-foreground flex-1">{lecture.title}</h1>
              <button
                onClick={handleBookmarkToggle}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-border bg-background transition-all ${
                  isBookmarked ? "text-primary border-primary/30" : "text-muted hover:text-foreground"
                }`}
                title={isBookmarked ? "Bỏ lưu bài giảng" : "Lưu vào danh sách nghe sau"}
              >
                <Bookmark size={14} fill={isBookmarked ? "currentColor" : "none"} />
                <span>{isBookmarked ? "Đã lưu nghe" : "Nghe sau"}</span>
              </button>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-muted uppercase tracking-wider font-serif">Giới thiệu bài giảng</h4>
              <p className="text-sm text-muted leading-relaxed whitespace-pre-line">{lecture.description || "Chưa có mô tả."}</p>
            </div>

            {/* Teacher Details */}
            {lecture.teacher && (
              <div className="border-t border-border/40 pt-4 flex items-center space-x-4">
                <div className="w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center text-primary text-lg select-none">
                  ☸
                </div>
                <div>
                  <h5 className="text-sm font-bold text-foreground">Giảng sư: {lecture.teacher.name}</h5>
                  <p className="text-[11px] text-muted truncate max-w-sm">{lecture.teacher.organization || "Thiền viện"}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Clickable Timestamps & Attachments */}
        <div className="space-y-6">
          {/* Timestamps Card */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-foreground font-serif border-b border-border/60 pb-2 flex items-center">
              <Clock size={16} className="mr-1.5 text-primary" />
              <span>Phân mục thời gian</span>
            </h3>
            
            {timestamps.length === 0 ? (
              <p className="text-xs text-muted italic">Bài giảng chưa chia phân mục thời gian.</p>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {timestamps.map((t: any, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => handleTimestampClick(t.time)}
                    className="w-full flex items-center text-left text-xs text-muted hover:text-primary hover:bg-muted-foreground/5 p-1.5 rounded transition-colors group font-medium"
                  >
                    <span className="font-mono text-primary mr-2 bg-primary/5 border border-primary/20 rounded px-1.5 py-0.5 group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                      {formatSeconds(t.time)}
                    </span>
                    <span className="truncate flex-1">{t.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Series / Related Info */}
          {lecture.series_name && (
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-3 text-sm">
              <h4 className="font-serif font-bold text-foreground">Thuộc chuỗi bài giảng</h4>
              <p className="text-xs text-primary font-semibold">{lecture.series_name}</p>
              {lecture.series_order && <p className="text-xs text-muted">Số thứ tự bài: #{lecture.series_order}</p>}
            </div>
          )}
        </div>
      </div>

      {/* Collapsible Transcript Section */}
      {lecture.transcript && (
        <section className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
          <button
            onClick={() => setTranscriptOpen(!transcriptOpen)}
            className="w-full flex items-center justify-between text-sm font-bold text-foreground font-serif"
          >
            <span className="flex items-center">
              <FileText size={18} className="mr-1.5 text-primary" />
              <span>Bản ghi âm văn bản (Transcript)</span>
            </span>
            {transcriptOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          
          {transcriptOpen && (
            <div className="border-t border-border/40 pt-4 text-sm text-muted leading-relaxed whitespace-pre-line animate-fadeIn">
              {lecture.transcript}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
