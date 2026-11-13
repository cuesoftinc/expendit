import { CircleHelp } from "lucide-react";
import { SUPPORT_URL } from "@/components/home/links";

export default function HelpMenu() {
  return (
    <details className="relative shrink-0">
      <summary
        aria-label="Help"
        className="block cursor-pointer list-none rounded p-1 text-text-2 hover:text-text focus-visible:ring-2 focus-visible:ring-accent"
      >
        <CircleHelp aria-hidden="true" className="h-4 w-4" />
      </summary>
      <a
        href={SUPPORT_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-full left-0 z-overlay mb-2 block whitespace-nowrap rounded border border-border bg-bg px-3 py-2 text-[13px] text-text shadow-lg hover:bg-bg-elev focus-visible:ring-2 focus-visible:ring-accent"
      >
        Contact support
      </a>
    </details>
  );
}
