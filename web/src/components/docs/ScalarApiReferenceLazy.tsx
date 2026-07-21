"use client";

// Lazy boundary for the Scalar embed (perf audit 2026-07-21, P10 —
// fleet-uniform across apparule/expendit/upstat): @scalar/api-reference-react
// is the app's single heaviest dependency, and `next/dynamic` alone only
// MOVES it out of the first-load chunks — the async chunk group still
// downloads right after hydration, so the settled /docs/api payload stayed
// ~1408KB encoded / ~4874KB decoded JS (network-recorded, prod build). The
// payload diet (2026-07-21) therefore gates the import on USER INTENT: the
// first pointer / key / wheel / touch / scroll gesture, or the explicit
// "Load" button (the screen-reader path — SR virtual-cursor navigation
// doesn't always dispatch key events; the button always works). Bots,
// probes and bounces never pay for Scalar; any human interacting mounts it
// within their first gesture, and only the page shell ships eagerly. The
// placeholder reserves the embed's viewport slice (100dvh minus the sticky
// nav, via --scalar-custom-header-height set by the view on <main>) so the
// swap-in shifts no layout. Theme forcing, the hidden theme toggle and
// `showDeveloperTools: "never"` live in ScalarApiReference — unchanged.

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/Button";

// One reserved box for every pre-mount state — placeholder and loading
// fallback share the same geometry, so arming the gate shifts nothing.
const RESERVED_BOX =
  "flex min-h-[calc(100dvh-var(--scalar-custom-header-height,0px))] flex-col items-center justify-center gap-3 text-[13px] text-text-2";

const ScalarApiReference = dynamic(
  () => import("./ScalarApiReference").then((m) => m.ScalarApiReference),
  {
    ssr: false,
    loading: () => (
      <div role="status" className={RESERVED_BOX}>
        Loading API reference…
      </div>
    ),
  },
);

/** First-gesture events that signal a real visitor (all passive). */
const INTENT_EVENTS = [
  "pointerdown",
  "pointermove",
  "keydown",
  "wheel",
  "touchstart",
  "scroll",
] as const;

export function ScalarApiReferenceLazy() {
  const [wanted, setWanted] = useState(false);

  useEffect(() => {
    if (wanted) return;
    const arm = () => setWanted(true);
    const options: AddEventListenerOptions = { once: true, passive: true };
    for (const event of INTENT_EVENTS) {
      window.addEventListener(event, arm, options);
    }
    return () => {
      for (const event of INTENT_EVENTS) {
        window.removeEventListener(event, arm);
      }
    };
  }, [wanted]);

  if (wanted) {
    return <ScalarApiReference />;
  }

  return (
    <div className={RESERVED_BOX}>
      <Button kind="quiet" size="sm" onClick={() => setWanted(true)}>
        Load the interactive API reference
      </Button>
    </div>
  );
}
