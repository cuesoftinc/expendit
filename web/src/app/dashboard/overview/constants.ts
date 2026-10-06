import { formatIso } from "@/lib/dates";

// Registry default category color — data, not styling; it mirrors mock data.
export const FALLBACK_CATEGORY_COLOR = "#6E6E76";

export const monthLabel = (month: string): string =>
  formatIso(`${month}-01`, "MMM");
