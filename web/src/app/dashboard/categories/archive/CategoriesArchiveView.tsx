"use client";

/**
 * B8b `/dashboard/categories/archive` — the registry's Archive tab
 * (pages.md B8, ratified 2026-07-21). Archived categories keep their
 * history but leave pickers, merge targets, and new imports; rows offer
 * a quiet Unarchive (reversible — never a danger affordance). Absolute
 * dates per the finance idiom. Render-only.
 */

import React from "react";
import { useCategoriesController, useOrg } from "@/controllers";
import type { Category } from "@/models";
import { formatIso } from "@/lib/dates";
import Banner from "@/components/ui/Banner";
import Button from "@/components/ui/Button";
import CategoryChip from "@/components/ui/CategoryChip";
import RouteTabs from "@/components/ui/RouteTabs";
import Skeleton from "@/components/ui/Skeleton";
import PageHeader from "../../PageHeader";
import ToastLayer from "../../ToastLayer";
import { CATEGORY_TABS } from "../tabs";

/** "Archived 14 Mar 2026 · 12 transactions this year" (absolute dates). */
const archiveMeta = (category: Category): string => {
  const count = category.txn_count_ytd ?? 0;
  const usage = `${count} ${count === 1 ? "transaction" : "transactions"} this year`;
  return category.archived_at
    ? `Archived ${formatIso(category.archived_at, "d MMM yyyy")} · ${usage}`
    : usage;
};

export const CategoriesArchiveView: React.FC = () => {
  const { activeOrgId } = useOrg();
  const categories = useCategoriesController(activeOrgId, { archived: true });
  const [toast, setToast] = React.useState<string | null>(null);

  const restore = async (category: Category) => {
    try {
      await categories.unarchive(category.id);
      setToast(`"${category.name}" restored to the active registry`);
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Restore failed");
    }
  };

  return (
    <>
      <PageHeader
        title="Categories"
        description="The registry behind every chip, donut slice, and tax treatment."
      />

      <RouteTabs tabs={[...CATEGORY_TABS]} aria-label="Category registry views">
        {categories.error ? (
          <div className="mb-4">
            <Banner kind="error">{categories.error}</Banner>
          </div>
        ) : null}

        {categories.loading && categories.items.length === 0 ? (
          <Skeleton variant="chart" />
        ) : (
          <section
            aria-label="Archived categories"
            className="rounded border border-border bg-bg"
          >
            <header className="border-b border-border px-4 py-2.5">
              <h2 className="text-[13px] font-medium text-text">
                Archived categories
              </h2>
            </header>
            {categories.items.length === 0 ? (
              <p className="px-4 py-6 text-center text-[13px] text-text-2">
                Nothing archived yet — archiving hides a category from
                pickers and new imports without touching history.
              </p>
            ) : (
              <ul className="list-none">
                {categories.items.map((category) => (
                  <li
                    key={category.id}
                    // flex-wrap: at narrow widths the action wraps under
                    // the chip instead of pushing the page wide (mobile
                    // canon).
                    className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-border px-4 py-2 last:border-b-0"
                  >
                    <CategoryChip
                      category={{
                        id: category.id,
                        name: category.name,
                        color: category.color,
                      }}
                    />
                    <span className="min-w-0 flex-1 truncate text-[12px] text-text-2">
                      {archiveMeta(category)}
                    </span>
                    <span className="flex shrink-0 items-center">
                      <Button
                        kind="quiet"
                        size="sm"
                        onClick={() => void restore(category)}
                      >
                        Unarchive
                      </Button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </RouteTabs>

      <ToastLayer message={toast} onDismiss={() => setToast(null)} />
    </>
  );
};

export default CategoriesArchiveView;
