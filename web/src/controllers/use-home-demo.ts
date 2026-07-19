"use client";

/**
 * Home demo controller — the A5 interactive preview (EXP-001): persona
 * tabs over the three §8.3 synthetic datasets, CRUD-light recategorize
 * on the demo rows (MI-4 chip combobox), and the data-table toggle for
 * the cash-flow chart (design.md §5 chart parity). Views render only;
 * every interaction emits `demo_interact` (pages.md event register).
 */

import { useCallback, useMemo, useState } from "react";
import {
  DEMO_DATASETS,
  type DemoDataset,
  type DemoPersona,
  type DemoTxn,
} from "@/mock/demo";
import { useAnalyticsController } from "./use-analytics";

/** Per-persona category overrides from demo recategorize actions. */
type Overrides = Partial<Record<DemoPersona, Record<string, string>>>;

export interface HomeDemoController {
  persona: DemoPersona;
  dataset: DemoDataset;
  /** Demo txns with local recategorize overrides applied. */
  txns: DemoTxn[];
  showDataTable: boolean;
  switchPersona: (persona: DemoPersona) => void;
  recategorize: (txnId: string, categoryId: string) => void;
  toggleDataTable: () => void;
}

export const useHomeDemoController = (): HomeDemoController => {
  const { track } = useAnalyticsController();
  const [persona, setPersona] = useState<DemoPersona>("freelancer");
  const [overrides, setOverrides] = useState<Overrides>({});
  const [showDataTable, setShowDataTable] = useState(false);

  const dataset = DEMO_DATASETS[persona];

  const txns = useMemo(() => {
    const personaOverrides = overrides[persona] ?? {};
    return dataset.txns.map((txn) => {
      const categoryId = personaOverrides[txn.id];
      // Human confirm clears the ✨ (MI-4).
      return categoryId ? { ...txn, categoryId, ai: false } : txn;
    });
  }, [dataset, overrides, persona]);

  const switchPersona = useCallback(
    (next: DemoPersona) => {
      setPersona(next);
      track("demo_interact", { action: "switch_persona", persona: next });
    },
    [track],
  );

  const recategorize = useCallback(
    (txnId: string, categoryId: string) => {
      setOverrides((prev) => ({
        ...prev,
        [persona]: { ...prev[persona], [txnId]: categoryId },
      }));
      track("demo_interact", { action: "recategorize", persona });
    },
    [persona, track],
  );

  const toggleDataTable = useCallback(() => {
    // Track outside the updater — updaters must stay pure (Strict Mode
    // double-invokes them).
    const next = !showDataTable;
    setShowDataTable(next);
    track("demo_interact", {
      action: "toggle_data_table",
      state: next ? "table" : "chart",
    });
  }, [showDataTable, track]);

  return {
    persona,
    dataset,
    txns,
    showDataTable,
    switchPersona,
    recategorize,
    toggleDataTable,
  };
};
