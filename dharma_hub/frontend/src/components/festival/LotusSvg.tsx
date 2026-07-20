"use client";

import React, { useId } from "react";

/** Hoa sen SVG trang nhã — dùng cho animation lễ. */

export function LotusIcon({ className = "", size = 28 }: { className?: string; size?: number }) {
  const uid = useId().replace(/:/g, "");
  const a = `lgA-${uid}`;
  const b = `lgB-${uid}`;
  const c = `lgC-${uid}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path
        d="M32 52C26 46 18 42 12 42c4 8 12 14 20 16 8-2 16-8 20-16-6 0-14 4-20 10z"
        fill={`url(#${a})`}
        opacity="0.9"
      />
      <path
        d="M32 48C24 40 14 32 10 22c10 2 18 10 22 20 4-10 12-18 22-20-4 10-14 18-22 26z"
        fill={`url(#${b})`}
        opacity="0.85"
      />
      <path
        d="M32 48c8-8 18-16 22-26-10 2-18 10-22 20-4-10-12-18-22-20 4 10 14 18 22 26z"
        fill={`url(#${b})`}
        opacity="0.75"
      />
      <path d="M32 50c-6-12-6-24 0-34 6 10 6 22 0 34z" fill={`url(#${c})`} />
      <circle cx="32" cy="28" r="5" fill="#f5d78e" opacity="0.95" />
      <circle cx="32" cy="28" r="2.5" fill="#fff8e7" opacity="0.9" />
      <defs>
        <linearGradient id={a} x1="12" y1="42" x2="52" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#e8a0b0" />
          <stop offset="1" stopColor="#c45c6a" />
        </linearGradient>
        <linearGradient id={b} x1="10" y1="22" x2="54" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f2c4d0" />
          <stop offset="0.5" stopColor="#d97a8c" />
          <stop offset="1" stopColor="#b84d5e" />
        </linearGradient>
        <linearGradient id={c} x1="32" y1="16" x2="32" y2="50" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffe4ec" />
          <stop offset="0.4" stopColor="#f0a0b4" />
          <stop offset="1" stopColor="#c45c6a" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/** Cánh sen đơn — rơi nhẹ */
export function LotusPetal({ className = "" }: { className?: string }) {
  const uid = useId().replace(/:/g, "");
  const g = `pg-${uid}`;
  return (
    <svg
      width="18"
      height="24"
      viewBox="0 0 18 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path
        d="M9 2C6 8 3 12 2 18c4-1 6-3 7-8 1 5 3 7 7 8-1-6-4-10-7-16z"
        fill={`url(#${g})`}
        opacity="0.9"
      />
      <path d="M9 4c-1 5-1 10 0 14 1-4 1-9 0-14z" fill="#fff5f8" opacity="0.35" />
      <defs>
        <linearGradient id={g} x1="2" y1="2" x2="16" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffd6e0" />
          <stop offset="0.5" stopColor="#e88a9c" />
          <stop offset="1" stopColor="#c45c6a" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/** Pháp luân đơn giản */
export function DharmaWheelIcon({ className = "", size = 40 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <circle cx="32" cy="32" r="28" stroke="#d49c2a" strokeWidth="2.5" opacity="0.85" />
      <circle cx="32" cy="32" r="8" fill="#d49c2a" opacity="0.9" />
      <circle cx="32" cy="32" r="3.5" fill="#fff8e7" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
        <line
          key={deg}
          x1="32"
          y1="32"
          x2={32 + 26 * Math.cos((deg * Math.PI) / 180)}
          y2={32 + 26 * Math.sin((deg * Math.PI) / 180)}
          stroke="#d49c2a"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.75"
        />
      ))}
    </svg>
  );
}
