"use client";

/** Dashboard overview composition. Individual widgets live in ./overview. */

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { daysUntil, formatIso } from "@/lib/dates";
import { useOrg, useOverviewController } from "@/controllers";
import { useCategoriesController } from "@/controllers/use-categories";
import Banner from "@/components/ui/Banner";
import EmptyState from "@/components/ui/EmptyState";
import PeriodPicker from "@/components/ui/PeriodPicker";
import Tag from "@/components/ui/Tag";
import PageHeader from "./PageHeader";
import { CashFlowPanel } from "./overview/CashFlowPanel";
import { DemoOverview } from "./overview/DemoOverview";
import { LatestTransactions } from "./overview/LatestTransactions";
import { OverviewLoading } from "./overview/OverviewLoading";
import { OverviewSidePanels } from "./overview/OverviewSidePanels";
import { OverviewStats } from "./overview/OverviewStats";

export const OverviewView: React.FC = () => {
  const router = useRouter();
  const { activeOrg, activeOrgId } = useOrg();
  const {
    flows,
    categoryTotals,
    anomalies,
    latest,
    estimates,
    loading,
    error,
    loadCategoryTotals,
  } = useOverviewController(activeOrgId);
  const { items: categories } = useCategoriesController(activeOrgId);
  const [demoEnabled, setDemoEnabled] = useState(false);
  const [showDataTable, setShowDataTable] = useState(false);
  const [deadlineDismissed, setDeadlineDismissed] = useState(false);
  const currency = activeOrg?.currency ?? "NGN";
  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );
  const points = flows?.items ?? [];
  const isEmpty =
    !loading && latest.length === 0 && (points.at(-1)?.income ?? 0) === 0;
  const nearestDeadline = estimates
    .map((estimate) => ({
      ...estimate,
      daysToDue: daysUntil(estimate.due_date),
    }))
    .filter((estimate) => estimate.daysToDue >= 0 && estimate.daysToDue <= 30)
    .sort((a, b) => a.daysToDue - b.daysToDue)[0];

  if (loading) return <OverviewLoading />;
  if (isEmpty)
    return (
      <>
        <PageHeader
          title="Overview"
          actions={
            demoEnabled ? (
              <Tag tint="info" size="md">
                Demo data
              </Tag>
            ) : undefined
          }
        />
        <EmptyState
          kind="transactions"
          onAction={() => router.push("/dashboard/imports?upload=1")}
          demoToggle={{ enabled: demoEnabled, onChange: setDemoEnabled }}
          className={demoEnabled ? "" : "mx-auto mt-16 max-w-md"}
        />
        {demoEnabled ? <DemoOverview /> : null}
      </>
    );

  return (
    <>
      <PageHeader
        title="Overview"
        actions={
          <div className="w-36">
            <PeriodPicker
              mode="month"
              value={categoryTotals?.month ?? null}
              onValueChange={(month) => void loadCategoryTotals(month)}
            />
          </div>
        }
      />
      {error ? (
        <div className="mb-4">
          <Banner kind="error">{error}</Banner>
        </div>
      ) : null}
      {nearestDeadline && !deadlineDismissed ? (
        <div className="mb-4">
          <Banner
            kind={nearestDeadline.daysToDue <= 7 ? "warn" : "info"}
            onDismiss={() => setDeadlineDismissed(true)}
            action={
              <Link
                href="/dashboard/taxes/file"
                className="text-[13px] font-medium text-accent-text hover:underline"
              >
                Prepare filing
              </Link>
            }
          >
            {nearestDeadline.kind.toUpperCase()} return due{" "}
            {nearestDeadline.daysToDue === 0
              ? "today"
              : nearestDeadline.daysToDue === 1
                ? "tomorrow"
                : `in ${nearestDeadline.daysToDue} days`}{" "}
            — {formatIso(nearestDeadline.due_date, "d MMM yyyy")}
          </Banner>
        </div>
      ) : null}
      <OverviewStats flows={flows} currency={currency} />
      <div
        data-testid="overview-mid-band"
        className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]"
      >
        <CashFlowPanel
          points={points}
          currency={currency}
          showDataTable={showDataTable}
          onToggle={() => setShowDataTable((shown) => !shown)}
        />
        <OverviewSidePanels
          categoryTotals={categoryTotals}
          categoryById={categoryById}
          anomalies={anomalies}
          currency={currency}
          onExplainAnomaly={(id) =>
            router.push(`/dashboard/transactions?record=${id}&explain=1`)
          }
        />
      </div>
      <LatestTransactions
        transactions={latest}
        categoryById={categoryById}
        onOpen={(id) => router.push(`/dashboard/transactions?record=${id}`)}
        onExplainAnomaly={(id) =>
          router.push(`/dashboard/transactions?record=${id}&explain=1`)
        }
      />
    </>
  );
};

export default OverviewView;
