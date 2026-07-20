"use client";

import React, { useMemo } from "react";
import { DharmaWheelIcon, LotusPetal } from "./LotusSvg";

type Intensity = "soft" | "medium" | "grand";

type Props = {
  intensity?: Intensity;
  /** true = luôn hiện (demo) */
  force?: boolean;
  className?: string;
};

/**
 * Lớp trang trí: cánh sen SVG bay nhẹ + pháp luân + hào quang.
 * pointer-events: none — không chặn click.
 */
export default function FestivalAmbient({ intensity = "medium", force = false, className = "" }: Props) {
  const count = intensity === "grand" ? 14 : intensity === "medium" ? 10 : 6;

  const petals = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: `${4 + ((i * 17 + 3) % 92)}%`,
      delay: `${(i % 7) * 0.7}s`,
      duration: `${11 + (i % 6) * 1.4}s`,
      scale: 0.65 + (i % 5) * 0.12,
      drift: i % 2 === 0 ? 1 : -1,
      opacity: 0.28 + (i % 4) * 0.08,
    }));
  }, [count]);

  return (
    <div
      className={`festival-ambient pointer-events-none fixed inset-0 z-[38] overflow-hidden ${className}`}
      data-force={force ? "1" : "0"}
      aria-hidden
    >
      {/* Hào quang vàng mềm góc trên */}
      <div className="festival-halo festival-halo-tl" />
      <div className="festival-halo festival-halo-tr" />

      {/* Tượng Phật vàng đồng (SVG mới) — medium + grand */}
      {(intensity === "grand" || intensity === "medium") && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/images/buddhas/festival-buddha.svg"
          alt=""
          className={`festival-buddha-mark ${intensity === "grand" ? "festival-buddha-grand" : "festival-buddha-medium"}`}
        />
      )}

      {/* Pháp luân quay rất chậm */}
      <div className="festival-wheel-wrap">
        <DharmaWheelIcon size={intensity === "grand" ? 56 : 44} className="festival-wheel" />
      </div>

      {/* Cánh sen rơi */}
      {petals.map((p) => (
        <span
          key={p.id}
          className="festival-petal-wrap"
          style={
            {
              left: p.left,
              animationDelay: p.delay,
              animationDuration: p.duration,
              opacity: p.opacity,
              ["--petal-scale" as string]: String(p.scale),
              ["--petal-drift" as string]: String(p.drift * 36),
            } as React.CSSProperties
          }
        >
          <LotusPetal />
        </span>
      ))}

      {/* Đốm sáng lơ lửng */}
      {Array.from({ length: intensity === "soft" ? 4 : 8 }, (_, i) => (
        <span
          key={`dot-${i}`}
          className="festival-spark"
          style={{
            left: `${10 + i * 11}%`,
            top: `${15 + (i % 5) * 14}%`,
            animationDelay: `${i * 0.4}s`,
          }}
        />
      ))}
    </div>
  );
}
