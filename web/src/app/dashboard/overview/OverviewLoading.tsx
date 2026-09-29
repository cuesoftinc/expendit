import React from "react";
import ChartDonut from "@/components/ui/ChartDonut";
import ChartLine from "@/components/ui/ChartLine";
import Skeleton from "@/components/ui/Skeleton";
import StatCard from "@/components/ui/StatCard";
import PageHeader from "../PageHeader";

/** Keeps the loaded dashboard geometry reserved while its data is fetched. */
export const OverviewLoading: React.FC = () => (
  <div>
    <PageHeader
      title="Overview"
      actions={<div aria-hidden className="h-8 w-36" />}
    />
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[0, 1, 2, 3].map((index) => (
        <StatCard
          key={index}
          label=""
          value={0}
          loading
          className="lg:min-h-(--widget-h-stat)"
        />
      ))}
    </div>
    <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
      <div className="rounded border border-border bg-bg p-4 lg:min-h-(--widget-h-chart-card)">
        <ChartLine state="loading" />
      </div>
      <div className="space-y-4">
        <div className="rounded border border-border bg-bg p-4 lg:min-h-(--widget-h-donut-card)">
          <ChartDonut state="loading" />
        </div>
        <div
          aria-hidden
          className="rounded border border-border bg-bg lg:min-h-(--widget-h-anomaly-card)"
        />
      </div>
    </div>
    <div className="mt-4 rounded border border-border bg-bg lg:min-h-(--widget-h-latest-card)">
      <div className="space-y-0 p-4">
        {[0, 1, 2, 3, 4].map((index) => (
          <Skeleton key={index} variant="row" />
        ))}
      </div>
    </div>
  </div>
);
