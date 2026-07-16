"use client";

import React, { useRef, useState, useEffect } from "react";
import { Play, Pause, Volume2, RotateCcw, SkipForward } from "lucide-react";

interface AudioPlayerProps {
  src: string;
  title: string;
  speaker?: string;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
}

export default function AudioPlayer({ src, title, speaker, onTimeUpdate }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);

  useEffect(() => {
    // Reset state on source change
    setIsPlaying(false);
    setCurrentTime(0);
  }, [src]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {});
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const cur = audioRef.current.currentTime;
    const dur = audioRef.current.duration || 0;
    setCurrentTime(cur);
    setDuration(dur);
    if (onTimeUpdate) {
      onTimeUpdate(cur, dur);
    }
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    setDuration(audioRef.current.duration || 0);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const time = Number(e.target.value);
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const vol = Number(e.target.value);
    audioRef.current.volume = vol;
    setVolume(vol);
  };

  const handleRewind = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10);
  };

  const handleForward = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 10);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div className="w-full bg-card border border-border rounded-xl p-5 shadow-sm transition-colors duration-200">
      <audio
        ref={audioRef}
        src={src}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
      />
      
      {/* Player Header */}
      <div className="flex items-center space-x-4 mb-4">
        {/* Dharma Wheel animation spinning when playing */}
        <div className={`w-12 h-12 rounded-full border border-primary/20 flex items-center justify-center bg-primary/5 text-primary text-xl font-serif select-none ${isPlaying ? "animate-spin" : ""}`} style={{ animationDuration: "12s" }}>
          ☸
        </div>
        <div className="overflow-hidden">
          <h4 className="text-sm font-semibold text-foreground truncate">{title}</h4>
          {speaker && <p className="text-xs text-muted truncate">{speaker}</p>}
        </div>
      </div>

      {/* Progress Bar slider */}
      <div className="mb-3">
        <input
          type="range"
          min={0}
          max={duration || 100}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-1 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1.5 font-mono">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex items-center justify-between">
        {/* Skip Back / Seek Controls */}
        <div className="flex items-center space-x-3">
          <button
            onClick={handleRewind}
            className="p-2 text-muted hover:text-foreground rounded-full hover:bg-muted-foreground/10 transition-colors"
            title="Lùi lại 10s"
          >
            <RotateCcw size={16} />
          </button>
          
          {/* Main Play/Pause */}
          <button
            onClick={togglePlay}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/95 transition-colors"
            title={isPlaying ? "Tạm dừng" : "Phát"}
          >
            {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} className="ml-0.5" fill="currentColor" />}
          </button>
          
          <button
            onClick={handleForward}
            className="p-2 text-muted hover:text-foreground rounded-full hover:bg-muted-foreground/10 transition-colors"
            title="Tiến lên 10s"
          >
            <SkipForward size={16} />
          </button>
        </div>

        {/* Volume controls */}
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
