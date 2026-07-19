"use client";

/**
 * ScaledEmbed — renders a fixed-design-width composition (the hero B1
 * embed, the A5a screen thumbnails) scaled to its container, the same
 * way the Figma Home frame scales real component instances into device
 * frames and thumbs. Pure CSS transform; no re-layout of the child.
 */

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

export interface ScaledEmbedProps {
  /** The child composition's natural width in px. */
  designWidth: number;
  /** The child composition's natural height in px. */
  designHeight: number;
  className?: string;
  children: React.ReactNode;
}

export const ScaledEmbed: React.FC<ScaledEmbedProps> = ({
  designWidth,
  designHeight,
  className,
  children,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const node = containerRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      const width = entry?.contentRect.width ?? designWidth;
      setScale(width / designWidth);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [designWidth]);

  return (
    <div
      ref={containerRef}
      className={cn("w-full overflow-hidden", className)}
      style={{ height: designHeight * scale }}
    >
      <div
        style={{
          width: designWidth,
          height: designHeight,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default ScaledEmbed;
