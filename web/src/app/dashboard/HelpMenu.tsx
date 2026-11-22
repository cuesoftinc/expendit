import { CircleHelp } from "lucide-react";
import { SUPPORT_URL } from "@/components/home/links";

export default function HelpMenu() {
  return (
    <a
      href={SUPPORT_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contact support (opens in a new tab)"
      title="Contact support"
      className="shrink-0 rounded p-1 text-text-2 transition-colors duration-fast ease-standard hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <CircleHelp aria-hidden="true" className="h-4 w-4" />
    </a>
  );
}
