import { notFound } from "next/navigation";
import { ComponentGallery } from "./gallery";

/**
 * Dev-only component gallery — every components/ui/* set in all variants
 * with labels, for the W1 Figma-match QA loop (web-implementation.md §2).
 * Available in dev and TEST_MODE builds; hidden from production.
 */
export const metadata = { title: "Expendit — component gallery (dev)" };

export default function DevComponentsPage() {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PUBLIC_TEST_MODE !== "1"
  ) {
    notFound();
  }
  return <ComponentGallery />;
}
