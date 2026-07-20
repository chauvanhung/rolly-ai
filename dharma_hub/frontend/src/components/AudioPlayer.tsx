"use client";

import React, { useRef, useState, useEffect } from "react";
import { Play, Pause, Volume2, RotateCcw, SkipForward, AlertCircle } from "lucide-react";

interface AudioPlayerProps {
  src: string;
  title: string;
  speaker?: string;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
}

/** Resolve relative /api/uploads paths for current site origin. */
function resolveAudioSrc(src: string): string {
  if (!src) return "";
  if (/^https?:\/\//i.test(src) || src.startsWith("blob:") || src.startsWith("data:")) {
    return src;
  }
  // Absolute path on same host
  if (src.startsWith("/")) {
    if (typeof window !== "undefined") {
      return `${window.location.origin}${src}`;
    }
    return src;
  }
  return src;
}

export default function AudioPlayer({ src, title, speaker, onTimeUpdate }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.9);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const resolvedSrc = resolveAudioSrc(src);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setError("");
    setLoading(true);
    const el = audioRef.current;
    if (el) {
      el.volume = volume;
      el.load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when source changes
  }, [resolvedSrc]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const togglePlay = async () => {
    const el = audioRef.current;
    if (!el) return;
    setError("");
    if (isPlaying) {
      el.pause();
      return;
    }
    try {
      // Some browsers need load() before first play on remote mp3
      if (el.readyState < 2) {
        el.load();
      }
      await el.play();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Không phát được audio.";
      // Common browser autoplay / decode messages
      if (/NotSupportedError|no supported/i.test(message)) {
        setError("Trình duyệt không phát được file này. Kiểm tra URL MP3 hoặc định dạng.");
      } else if (/NotAllowedError/i.test(message)) {
        setError("Trình duyệt chặn phát tự động. Hãy bấm Play lại.");
      } else {
        setError(`Không nghe được: ${message}`);
      }
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const cur = audioRef.current.currentTime;
    const dur = audioRef.current.duration || 0;
    setCurrentTime(cur);
    if (Number.isFinite(dur) && dur > 0) setDuration(dur);
    if (onTimeUpdate) onTimeUpdate(cur, dur);
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    const dur = audioRef.current.duration || 0;
    if (Number.isFinite(dur) && dur > 0) setDuration(dur);
    setLoading(false);
  };

  const handleCanPlay = () => setLoading(false);

  const handleError = () => {
    setLoading(false);
    setIsPlaying(false);
    const code = audioRef.current?.error?.code;
    const map: Record<number, string> = {
      1: "Tải audio bị hủy.",
      2: "Lỗi mạng khi tải audio (kiểm tra /api/uploads).",
      3: "File MP3 hỏng hoặc không giải mã được.",
      4: "Không tìm thấy file audio (404) hoặc định dạng không hỗ trợ.",
    };
    setError(
      (code && map[code]) ||
        `Không tải được audio. URL: ${resolvedSrc || "(trống)"}`
    );
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const time = Number(e.target.value);
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(Number(e.target.value));
  };

  const handleRewind = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10);
  };

  const handleForward = () => {
    if (!audioRef.current) return;
    const max = duration || audioRef.current.duration || 0;
    audioRef.current.currentTime = Math.min(max, audioRef.current.currentTime + 10);
  };

  const formatTime = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div className="w-full bg-card border border-border rounded-xl p-5 shadow-sm transition-colors duration-200">
      <audio
        ref={audioRef}
        src={resolvedSrc || undefined}
        preload="metadata"
        playsInline
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onCanPlay={handleCanPlay}
        onError={handleError}
      />

      <div className="flex items-center space-x-4 mb-4">
        <div
          className={`w-12 h-12 rounded-full border border-primary/20 flex items-center justify-center bg-primary/5 text-primary text-xl font-serif select-none ${isPlaying ? "animate-spin" : ""}`}
          style={{ animationDuration: "12s" }}
        >
          ☸
        </div>
        <div className="overflow-hidden flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-foreground truncate">{title}</h4>
          {speaker && <p className="text-xs text-muted truncate">{speaker}</p>}
          {loading && !error && (
            <p className="text-[11px] text-muted mt-0.5">Đang tải audio...</p>
          )}
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100"
        >
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <div className="min-w-0 space-y-1">
            <p className="font-medium">{error}</p>
            {resolvedSrc && (
              <a
                href={resolvedSrc}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-[10px] underline break-all opacity-80"
              >
                Mở file trực tiếp
              </a>
            )}
          </div>
        </div>
      )}

      <div className="mb-3">
        <input
          type="range"
          min={0}
          max={duration || 100}
          step={0.1}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-1 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1.5 font-mono">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={handleRewind}
            className="p-2 text-muted hover:text-foreground rounded-full hover:bg-muted-foreground/10 transition-colors"
            title="Lùi lại 10s"
          >
            <RotateCcw size={16} />
          </button>

          <button
            type="button"
            onClick={() => void togglePlay()}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/95 transition-colors"
            title={isPlaying ? "Tạm dừng" : "Phát"}
          >
            {isPlaying ? (
              <Pause size={18} fill="currentColor" />
            ) : (
              <Play size={18} className="ml-0.5" fill="currentColor" />
            )}
          </button>

          <button
            type="button"
            onClick={handleForward}
            className="p-2 text-muted hover:text-foreground rounded-full hover:bg-muted-foreground/10 transition-colors"
            title="Tiến lên 10s"
          >
            <SkipForward size={16} />
          </button>
        </div>

        <div className="flex items-center space-x-2 text-muted">
          <Volume2 size={16} />
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={handleVolumeChange}
            className="w-20 h-1 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
          />
        </div>
      </div>
    </div>
  );
}
