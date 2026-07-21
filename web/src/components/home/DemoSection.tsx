"use client";

/**
 * A5 — Interactive preview (EXP-001): read-only demo report over the
 * three §8.3 synthetic datasets. Persona Tabs (pill), "This is demo
 * data" Tag, MI-7 count-up StatCards, cash-flow line (+ data-table
 * toggle, design.md §5), category donut, and the synthetic txn table
 * with CRUD-light inline recategorize (MI-4). Render-only view over
 * useHomeDemoController.
 */

import React from "react";
import Tabs, { TabItem, TabPanel } from "@/components/ui/Tabs";
import Tag from "@/components/ui/Tag";
import StatCard from "@/components/ui/StatCard";
import ChartLine from "@/components/ui/ChartLine";
import ChartDonut from "@/components/ui/ChartDonut";
import TableHeader from "@/components/ui/TableHeader";
import TxnTableRow from "@/components/ui/TxnTableRow";
import { DEMO_PERSONAS, DEMO_DATASETS, type DemoPersona } from "@/mocks/demo";
import { useHomeDemoController } from "@/controllers/use-home-demo";
import { formatMoney } from "@/lib/format";
import { SectionHeading, SectionInner } from "./Section";
import DonutLegend from "./DonutLegend";
import { toTxnEntry, TXN_COLUMNS } from "./embeds";
import { ANCHORS } from "./links";

export const DemoSection: React.FC = () => {
  const {
    persona,
    dataset,
    txns,
    showDataTable,
    switchPersona,
    recategorize,
    toggleDataTable,
  } = useHomeDemoController();

  const { stats } = dataset;

  return (
    <section id={ANCHORS.demo} className="scroll-mt-16 bg-bg-elev py-20">
      <SectionInner>
        <div className="flex items-center justify-center gap-3">
          <SectionHeading>Explore the live demo</SectionHeading>
          <Tag tint="info" size="md">
            This is demo data
          </Tag>
        </div>

        <Tabs
          value={persona}
          onValueChange={(value) => switchPersona(value as DemoPersona)}
          kind="pill"
          aria-label="Demo persona"
          className="mt-6 flex flex-col items-center"
          items={DEMO_PERSONAS.map((key) => (
            <TabItem key={key} value={key} kind="pill">
              {DEMO_DATASETS[key].label}
            </TabItem>
          ))}
        >
          {DEMO_PERSONAS.map((key) => (
            <TabPanel key={key} value={key} className="w-full pt-8">
              {key !== persona ? null : (
                <>
                  {/* 3-up stat row on the 384px-card / 24px-gutter rhythm,
                      spanning the 1200px container (design.md §2 pin). */}
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                    <StatCard
                      label={stats.net.label}
                      value={stats.net.value}
                      format={(value) => formatMoney(value)}
                      delta={stats.net.delta}
                      deltaCaption={dataset.deltaCaption}
                      sparkline={stats.net.sparkline}
                    />
                    <StatCard
                      label={stats.income.label}
                      value={stats.income.value}
                      format={(value) => formatMoney(value)}
                      delta={stats.income.delta}
                      deltaCaption={dataset.deltaCaption}
                      sparkline={stats.income.sparkline}
                    />
                    <StatCard
                      label={stats.expenses.label}
                      value={stats.expenses.value}
                      format={(value) => formatMoney(value)}
                      delta={stats.expenses.delta}
                      deltaCaption={dataset.deltaCaption}
                      sparkline={stats.expenses.sparkline}
                    />
                  </div>

                  <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr]">
                    <div className="rounded border border-border bg-bg p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-[13px] font-medium text-text">
                          Cash flow — 12 months
                        </span>
                        {/* Chart data-table parity toggle (design.md §5). */}
                        <button
                          type="button"
                          onClick={toggleDataTable}
                          aria-pressed={showDataTable}
                          className="rounded border border-border px-2 py-0.5 text-[11px] font-medium text-text-2 transition-colors duration-fast ease-standard hover:bg-bg-elev hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                        >
                          Data table
                        </button>
                      </div>
                      {showDataTable ? (
                        <table className="w-full text-[13px]">
                          <caption className="sr-only">
                            Cash flow by month
                          </caption>
                          <thead>
                            <tr className="border-b border-border text-left text-text-2">
                              <th scope="col" className="py-1 font-medium">
                                Month
                              </th>
                              <th
                                scope="col"
                                className="py-1 text-right font-medium"
                              >
                                Net cash flow
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {dataset.cashflow.points.map((value, index) => (
                              // Months run Aug → Jul (trailing 12).
                              <tr
                                key={index}
                                className="border-b border-border last:border-0"
                              >
                                <td className="py-1 text-text-2">
                                  M{index + 1}
                                </td>
                                <td className="py-1 text-right tabular-nums text-text">
                                  {formatMoney(value)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <ChartLine
                          series={[
                            {
                              id: "cashflow",
                              label: "Net cash flow",
                              color: "accent",
                              points: dataset.cashflow.points,
                            },
                          ]}
                          xLabels={dataset.cashflow.xLabels}
                          height={200}
                        />
                      )}
                    </div>
                    <div className="rounded border border-border bg-bg p-4">
                      <div className="mb-3 text-[13px] font-medium text-text">
                        Expenses by category
                      </div>
                      <div className="flex flex-wrap items-center gap-5">
                        <ChartDonut
                          slices={dataset.donut.slices}
                          centerTotal={dataset.donut.centerTotal}
                          centerCaption="Expenses"
                          legend="none"
                        />
                        <DonutLegend
                          slices={dataset.donut.slices}
                          className="min-w-[220px] flex-1"
                        />
                      </div>
                    </div>
                  </div>

                  <div
                    data-testid="demo-table"
                    className="mt-6 overflow-x-auto rounded border border-border bg-bg"
                  >
                    <table
                      aria-label="Demo transactions"
                      className="w-full min-w-[720px]"
                    >
                      <TableHeader
                        columns={TXN_COLUMNS}
                        sort={{ columnId: "date", direction: "desc" }}
                      />
                      <tbody className="contents">
                        {txns.map((txn) => (
                          <TxnTableRow
                            key={txn.id}
                            txn={toTxnEntry(txn)}
                            category={
                              dataset.categories.find(
                                (category) => category.id === txn.categoryId,
                              ) ?? dataset.categories[0]
                            }
                            categoryOptions={dataset.categories}
                            onCategorySelect={(categoryId) =>
                              recategorize(txn.id, categoryId)
                            }
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </TabPanel>
          ))}
        </Tabs>
      </SectionInner>
    </section>
  );
};

export default DemoSection;
