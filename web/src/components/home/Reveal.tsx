"use client";

/**
 * Reveal — one-shot fade-in when scrolled into view (A4a: stills swap on
 * scroll-into-view; static under reduced motion, design.md §5). Content
 * is always in the DOM; only opacity animates, so no-JS/reduced-motion
 * render identically.
 */

import React, { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/lib/use-reduced-motion";
import { cn } from "@/lib/cn";

export const Reveal: React.FC<{
  className?: string;
  children: React.ReactNode;
}> = ({ className, children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (prefersReducedMotion() || typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-shown={shown}
      className={cn(
        "transition-opacity duration-entrance ease-standard motion-reduce:transition-none",
        shown ? "opacity-100" : "opacity-0",
        className,
      )}
    >
      {children}
    </div>
  );
};

export default Reveal;
