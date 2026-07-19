"use client";

/**
 * The W1 component gallery — renders every components/ui set in all
 * variants with labels for the Figma-match QA loop. Dev/TEST_MODE only
 * (guarded by page.tsx). Theme toggles via data-theme on <html> — the
 * same mechanism as the B9 settings control.
 */

import React, { useCallback, useState } from "react";
import {
  ArrowLeftRight,
  Banknote,
  Gauge,
  Landmark,
  LayoutDashboard,
  Moon,
  Sun,
  Tag as TagIcon,
  Upload,
  Users,
} from "lucide-react";
import type {
  BankLink,
  BankLinkStatus,
  ImportJob,
  LineItem,
  MappingRow,
  Member,
  ReportArtifact,
  TaxFiling,
  TxnEntry,
} from "@/models";
import { BALANCE_SHEET_KEYS } from "@/models/registry/line-items";
import { formatMoney } from "@/lib/format";

import Accordion from "@/components/ui/Accordion";
import AnomalyBadge from "@/components/ui/AnomalyBadge";
import AppNav, { NavGroupLabel, NavItem } from "@/components/ui/AppNav";
import Avatar from "@/components/ui/Avatar";
import Banner from "@/components/ui/Banner";
import BulkActionBar from "@/components/ui/BulkActionBar";
import Button from "@/components/ui/Button";
import CategoryChip from "@/components/ui/CategoryChip";
import ChartDonut from "@/components/ui/ChartDonut";
import ChartLine from "@/components/ui/ChartLine";
import Checkbox from "@/components/ui/Checkbox";
import CodeSnippet from "@/components/ui/CodeSnippet";
import ColorSwatchPicker from "@/components/ui/ColorSwatchPicker";
import CommandPalette from "@/components/ui/CommandPalette";
import ComparisonTable from "@/components/ui/ComparisonTable";
import EditorialCard from "@/components/ui/EditorialCard";
import EmptyState from "@/components/ui/EmptyState";
import FilingHistoryRow from "@/components/ui/FilingHistoryRow";
import FormRow from "@/components/ui/FormRow";
import GoogleAuthButton from "@/components/ui/GoogleAuthButton";
import ImportJobRow from "@/components/ui/ImportJobRow";
import Input from "@/components/ui/Input";
import Inspector from "@/components/ui/Inspector";
import Kbd from "@/components/ui/Kbd";
import LinkAccountCard from "@/components/ui/LinkAccountCard";
import ManualStatementRow from "@/components/ui/ManualStatementRow";
import MappingReviewRow from "@/components/ui/MappingReviewRow";
import MarketingFooter from "@/components/ui/MarketingFooter";
import MarketingNav from "@/components/ui/MarketingNav";
import MemberRow from "@/components/ui/MemberRow";
import Modal from "@/components/ui/Modal";
import MoneyCell from "@/components/ui/MoneyCell";
import OrgSwitcher from "@/components/ui/OrgSwitcher";
import PeriodPicker from "@/components/ui/PeriodPicker";
import ProgressBar from "@/components/ui/ProgressBar";
import Radio from "@/components/ui/Radio";
import RatioGauge from "@/components/ui/RatioGauge";
import RemitToCard from "@/components/ui/RemitToCard";
import ReportArtifactRow from "@/components/ui/ReportArtifactRow";
import SegmentedControl from "@/components/ui/SegmentedControl";
import Select from "@/components/ui/Select";
import Skeleton from "@/components/ui/Skeleton";
import StagedReviewHeader from "@/components/ui/StagedReviewHeader";
import StampedCheck from "@/components/ui/StampedCheck";
import StatCard from "@/components/ui/StatCard";
import StatementView from "@/components/ui/StatementView";
import Switch from "@/components/ui/Switch";
import TableHeader from "@/components/ui/TableHeader";
import Tabs, { TabItem, TabPanel } from "@/components/ui/Tabs";
import Tag from "@/components/ui/Tag";
import TaxCalendarRow from "@/components/ui/TaxCalendarRow";
import Toast from "@/components/ui/Toast";
import Tooltip from "@/components/ui/Tooltip";
import TxnTableRow from "@/components/ui/TxnTableRow";
import UploadDropzone from "@/components/ui/UploadDropzone";
import WizardShell from "@/components/ui/WizardShell";
import WizardStep from "@/components/ui/WizardStep";

/* ---------- gallery scaffolding ---------- */

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <section id={title} className="border-b border-border pb-8">
    <h2 className="mb-4 pt-8 font-mono text-[13px] font-semibold text-accent">
      {title}
    </h2>
    <div className="space-y-4">{children}</div>
  </section>
);

const Variant: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <div>
    <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-text-2">
      {label}
    </div>
    <div className="flex flex-wrap items-start gap-3">{children}</div>
  </div>
);

/* ---------- fixture data (docs-coherent) ---------- */

const categories = [
  { id: "cat-1", name: "Transport", color: "#2456D6" },
  { id: "cat-2", name: "Groceries", color: "#1B7F4B" },
  { id: "cat-3", name: "Client income", color: "#F46A1F" },
];

const txn = (overrides: Partial<TxnEntry> = {}): TxnEntry => ({
  id: "txn-1",
  org_id: "org-1",
  description: "Fuel — Lekki toll gate",
  amount: 18000,
  direction: "expense",
  category_id: "cat-1",
  txn_date: "2026-06-14",
  source: "csv",
  source_link_id: null,
  ai_categorized: true,
  excluded_from_reports: false,
  anomalies: [
    { rule_id: "large_transaction", severity: "warn", note: "3.2× median" },
  ],
  created_at: "2026-06-14T10:00:00Z",
  ...overrides,
});

const bankLink = (status: BankLinkStatus): BankLink => ({
  id: `bl-${status}`,
  org_id: "org-1",
  provider: "mono",
  institution: "GTBank",
  masked_account: "•••• 4521",
  status,
  last_synced_at: status === "pending" ? null : "2026-07-17 09:12",
  auto_confirm: false,
  imported_txn_count: 120,
  created_at: "2026-01-01T00:00:00Z",
});

const importJob = (overrides: Partial<ImportJob> = {}): ImportJob => ({
  id: "job-1",
  org_id: "org-1",
  source: "upload",
  status: "completed",
  file_name: "gtb-june-2026.csv",
  file_type: "csv",
  total_parsed: 214,
  duplicates_found: 5,
  imported: 209,
  summary: null,
  ai_summary: null,
  anomalies: [
    { rule_id: "duplicate_charge", severity: "info", note: "2 candidates" },
  ],
  warnings: [],
  error_code: null,
  confirmed: true,
  created_at: "2026-07-01T09:00:00Z",
  completed_at: "2026-07-01T09:01:00Z",
  ...overrides,
});

const artifact = (overrides: Partial<ReportArtifact> = {}): ReportArtifact => ({
  id: `ra-${Math.random().toString(36).slice(2, 8)}`,
  org_id: "org-1",
  kind: "monthly_summary",
  format: "pdf",
  period: "2026-06",
  params: {},
  status: "ready",
  signed_url: "#",
  created_at: "2026-07-01T09:00:00Z",
  expires_at: "2026-07-31T09:00:00Z",
  ...overrides,
});

const lirs = {
  code: "LIRS",
  name: "Lagos State Internal Revenue Service",
  payment_channels: ["eTax portal", "Bank branch"],
};

const filing = (overrides: Partial<TaxFiling> = {}): TaxFiling => ({
  id: "tf-1",
  org_id: "org-1",
  kind: "pit",
  period: "FY2026",
  status: "accepted",
  amount_due: 342500,
  due_date: "2027-03-31",
  computed_fields: [],
  authority: lirs,
  artifact_key: "receipts/tf-1.pdf",
  filed_at: "2027-01-15T10:00:00Z",
  created_at: "2027-01-15T09:00:00Z",
  ...overrides,
});

const members: Member[] = [
  {
    org_id: "org-1",
    user_id: "u-1",
    name: "Ada Obi",
    email: "ada@bellafricana.ng",
    role: "owner",
    status: "active",
    joined_at: "2026-01-01",
  },
  {
    org_id: "org-1",
    user_id: "u-2",
    name: "Chidi Eze",
    email: "chidi@bellafricana.ng",
    role: "admin",
    status: "active",
    joined_at: "2026-02-01",
  },
  {
    org_id: "org-1",
    user_id: "u-3",
    name: "",
    email: "tolu@bellafricana.ng",
    role: "member",
    status: "pending",
    joined_at: null,
  },
];

const orgs = [
  {
    id: "org-p",
    name: "Ada (personal)",
    kind: "personal" as const,
    currency: "NGN",
    country: "NG",
    fiscal_year_end: "12-31",
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "org-c",
    name: "Bellafricana Ltd",
    kind: "company" as const,
    currency: "NGN",
    country: "NG",
    fiscal_year_end: "12-31",
    created_at: "2026-01-01T00:00:00Z",
  },
];

const statementItems: LineItem[] = [
  {
    id: "li-1",
    statement_id: "st-1",
    canonical_key: "total_assets",
    source_label: "Total assets",
    amount: 5000000,
    status: "mapped",
    confidence: 0.98,
    mapped_by: "ai",
    derived: false,
  },
  {
    id: "li-2",
    statement_id: "st-1",
    canonical_key: "total_liabilities",
    source_label: "Liabilities",
    amount: 3000000,
    status: "mapped",
    confidence: null,
    mapped_by: "user",
    derived: false,
  },
  {
    id: "li-3",
    statement_id: "st-1",
    canonical_key: "equity",
    source_label: "Equity",
    amount: 2000000,
    status: "mapped",
    confidence: null,
    mapped_by: "user",
    derived: true,
  },
];

const mappingRow = (state: MappingRow["state"]): MappingRow => ({
  line_item_id: `li-${state}`,
  source_label:
    state === "unmapped"
      ? "Sundry debtors & advances"
      : "Cash at bank and in hand",
  canonical_key: state === "unmapped" ? null : "cash_and_equivalents",
  amount: 1250000,
  confidence: state === "suggested" ? 0.92 : null,
  state,
});

/* ---------- the gallery ---------- */

export const ComponentGallery: React.FC = () => {
  const [dark, setDark] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [dangerOpen, setDangerOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [checkbox, setCheckbox] = useState<boolean | "indeterminate">(true);
  const [radio, setRadio] = useState("keep");
  const [switchOn, setSwitchOn] = useState(true);
  const [segment, setSegment] = useState("comfortable");
  const [tab, setTab] = useState("profile");
  const [selectValue, setSelectValue] = useState<string | null>(null);
  const [comboValue, setComboValue] = useState<string | null>(null);
  const [period, setPeriod] = useState<string | null>("2026-Q2");
  const [swatch, setSwatch] = useState<string | null>("#2456D6");
  const [statValue, setStatValue] = useState(1240300);

  const toggleTheme = useCallback(() => {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
  }, [dark]);

  return (
    <div className="min-h-screen bg-bg font-sans text-text">
      <header className="sticky top-0 z-sticky flex items-center gap-3 border-b border-border bg-bg px-6 py-3">
        <h1 className="text-sm font-semibold">
          Expendit — W1 component gallery
        </h1>
        <span className="text-[11px] text-text-2">
          dev-only · every set, all variants · QA vs the Figma component pages
        </span>
        <button
          type="button"
          onClick={toggleTheme}
          className="ml-auto inline-flex items-center gap-1.5 rounded border border-border px-2.5 py-1 text-[13px] font-medium hover:bg-bg-elev"
        >
          {dark ? (
            <Sun aria-hidden className="h-3.5 w-3.5" />
          ) : (
            <Moon aria-hidden className="h-3.5 w-3.5" />
          )}
          {dark ? "Light" : "Dark"}
        </button>
      </header>

      <main className="mx-auto max-w-5xl space-y-2 px-6 pb-24">
        <Section title="Button">
          <Variant label="kind × md">
            <Button kind="primary">Primary</Button>
            <Button kind="quiet">Quiet</Button>
            <Button kind="destructive">Destructive</Button>
            <Button kind="danger-armed" armedSeconds={5}>
              Purge all data
            </Button>
          </Variant>
          <Variant label="sm · loading · disabled">
            <Button size="sm">Small</Button>
            <Button loading>Saving</Button>
            <Button disabled>Disabled</Button>
          </Variant>
        </Section>

        <Section title="Input">
          <Variant label="text · search · error · disabled">
            <div className="w-56">
              <Input label="Description" name="g-desc" placeholder="Fuel" />
            </div>
            <div className="w-56">
              <Input
                type="search"
                placeholder="Search transactions"
                kbdHint="⌘K"
              />
            </div>
            <div className="w-56">
              <Input label="Amount" name="g-amt" error="Amount is required" />
            </div>
            <div className="w-56">
              <Input
                label="TIN"
                name="g-tin"
                disabled
                value="12345678"
                readOnly
              />
            </div>
          </Variant>
        </Section>

        <Section title="MoneyCell">
          <Variant label="direction × size">
            <MoneyCell amount={1240300.5} direction="income" />
            <MoneyCell amount={18000} direction="expense" />
            <MoneyCell amount={0} direction="zero" />
            <MoneyCell amount={98500} direction="income" size="stat" />
            <MoneyCell amount={42.5} direction="expense" currency="USD" />
          </Variant>
        </Section>

        <Section title="CategoryChip">
          <Variant label="confirmed · AI-suggested ✨ · editing (click)">
            <CategoryChip category={categories[0]} />
            <CategoryChip category={categories[1]} aiSuggested />
            <CategoryChip
              category={categories[0]}
              options={categories}
              onSelect={() => undefined}
            />
          </Variant>
        </Section>

        <Section title="AnomalyBadge">
          <Variant label="four types × inline">
            <AnomalyBadge type="large_transaction" severity="warn" />
            <AnomalyBadge type="spending_spike" severity="warn" />
            <AnomalyBadge type="abnormal_category" severity="info" />
            <AnomalyBadge type="duplicate_charge" severity="info" />
          </Variant>
          <Variant label="feed · MI-5 pulse">
            <div className="w-full max-w-sm space-y-2">
              <AnomalyBadge
                type="spending_spike"
                severity="warn"
                variant="feed"
                description="Dining out is up 62% vs last month"
                timestamp="2h"
              />
              <AnomalyBadge
                type="large_transaction"
                severity="warn"
                variant="feed"
                description="₦480,000.00 is 3.4× your median for Equipment"
                timestamp="2h"
                pulse
              />
            </div>
          </Variant>
        </Section>

        <Section title="Toast / Banner">
          <Variant label="Toast: info / warn / error">
            <Toast
              kind="info"
              action={<button type="button">Download</button>}
              onDismiss={() => undefined}
            >
              214 transactions found
            </Toast>
            <Toast kind="warn" onDismiss={() => undefined}>
              Some rows were partially extracted
            </Toast>
            <Toast
              kind="error"
              action={<button type="button">Retry</button>}
              onDismiss={() => undefined}
            >
              Upload failed — unreadable_file
            </Toast>
          </Variant>
          <Variant label="Banner: info (T-30) / warn (T-7) / error (reauth)">
            <div className="w-full space-y-2">
              <Banner kind="info" onDismiss={() => undefined}>
                VAT for 2026-06 is due in 30 days
              </Banner>
              <Banner kind="warn" onDismiss={() => undefined}>
                VAT for 2026-06 is due in 7 days
              </Banner>
              <Banner
                kind="error"
                action={<button type="button">Re-authenticate</button>}
              >
                GTBank needs re-authentication
              </Banner>
            </div>
          </Variant>
        </Section>

        <Section title="StatCard">
          <Variant label="delta+sparkline · plain · loading · MI-7 count-up">
            <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-3">
              <StatCard
                label="Net cash"
                value={statValue}
                format={(value) => formatMoney(value, "NGN", { decimals: 0 })}
                delta={0.042}
                deltaCaption="vs Jun"
                sparkline={[3, 5, 4, 8, 7, 9, 12]}
              />
              <StatCard label="Expenses (June)" value={412000} delta={-0.08} />
              <StatCard label="Income (June)" value={0} loading />
            </div>
            <Button
              size="sm"
              kind="quiet"
              onClick={() => setStatValue((value) => value + 50000)}
            >
              Refresh data (count-up)
            </Button>
          </Variant>
        </Section>

        <Section title="TxnTableRow">
          <Variant label="default / selected / staged-duplicate · density ×2 (hover for MI-6 actions)">
            <table className="w-full rounded border border-border">
              <TableHeader
                columns={[
                  {
                    id: "date",
                    label: "Date",
                    widthClass: "w-20",
                    sortable: true,
                  },
                  { id: "desc", label: "Description" },
                  { id: "cat", label: "Category", widthClass: "w-32" },
                  {
                    id: "amt",
                    label: "Amount",
                    numeric: true,
                    widthClass: "w-32",
                  },
                ]}
                sort={{ columnId: "date", direction: "desc" }}
              />
              <tbody className="contents">
                <TxnTableRow
                  txn={txn()}
                  category={categories[0]}
                  categoryOptions={categories}
                />
                <TxnTableRow
                  txn={txn({
                    id: "txn-2",
                    description: "Invoice #114 — Bellafricana",
                    direction: "income",
                    amount: 450000,
                    source: "bank",
                    ai_categorized: false,
                    anomalies: [],
                  })}
                  category={categories[2]}
                  selected
                />
                <TxnTableRow
                  txn={txn({
                    id: "txn-3",
                    description: "POS duplicate — Shoprite",
                    anomalies: [
                      {
                        rule_id: "duplicate_charge",
                        severity: "info",
                        note: "same amount 2min apart",
                      },
                    ],
                  })}
                  category={categories[1]}
                  stagedDuplicate
                />
                <TxnTableRow
                  txn={txn({
                    id: "txn-4",
                    description: "Compact density row",
                    source: "receipt",
                  })}
                  category={categories[1]}
                  density="compact"
                />
              </tbody>
            </table>
          </Variant>
        </Section>

        <Section title="UploadDropzone">
          <Variant label="idle (drag to see drag-over) + per-file lifecycle (MI-2)">
            <div className="w-full max-w-lg">
              <UploadDropzone
                files={[
                  {
                    id: "f1",
                    name: "gtb-june.csv",
                    fileType: "csv",
                    state: { phase: "progress", percent: 40 },
                  },
                  {
                    id: "f2",
                    name: "receipts-scan.pdf",
                    fileType: "pdf",
                    state: { phase: "ai-sweep" },
                  },
                  {
                    id: "f3",
                    name: "gtb-may.csv",
                    fileType: "csv",
                    state: { phase: "complete", rowCount: 214 },
                  },
                  {
                    id: "f4",
                    name: "photo.png",
                    fileType: "image",
                    state: { phase: "error", message: "unreadable_file" },
                  },
                ]}
              />
            </div>
          </Variant>
        </Section>

        <Section title="LinkAccountCard">
          <Variant label="five BANK_LINK states">
            <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-2">
              {(
                [
                  "pending",
                  "active",
                  "reauth_required",
                  "degraded",
                  "paused",
                ] as const
              ).map((status) => (
                <LinkAccountCard
                  key={status}
                  link={bankLink(status)}
                  action={
                    status === "reauth_required" ? (
                      <Button size="sm" kind="quiet">
                        Re-link
                      </Button>
                    ) : undefined
                  }
                />
              ))}
            </div>
          </Variant>
        </Section>

        <Section title="RatioGauge">
          <Variant label="healthy / warning / critical / n-a · band on/off (MI-8)">
            <RatioGauge
              label="Current ratio"
              value={1.85}
              display="1.85"
              status="healthy"
              band={{ from: 1.2, to: 2.0 }}
              delta={0.21}
              deltaCaption="vs Q1"
              formula="Current ratio = current assets ÷ current liabilities"
            />
            <RatioGauge
              label="Quick ratio"
              value={0.95}
              display="0.95"
              status="warning"
              band={{ from: 1.0, to: 1.5 }}
              delta={-0.18}
              deltaCaption="vs Q1"
            />
            <RatioGauge
              label="Debt to equity"
              value={2.6}
              display="2.60"
              status="critical"
              max={3}
              delta={-0.44}
              deltaCaption="vs Q1"
            />
            <RatioGauge
              label="Interest cover"
              value={null}
              status="na"
              naReason="n/a — missing input"
            />
          </Variant>
        </Section>

        <Section title="Inspector">
          <Variant label="record / anomaly-explain / trace (MI-11)">
            <Button kind="quiet" onClick={() => setInspectorOpen(true)}>
              Open inspector
            </Button>
            <Inspector
              open={inspectorOpen}
              onClose={() => setInspectorOpen(false)}
              title="Fuel — Lekki toll gate"
              variant="record"
              footer={<Button size="sm">Save</Button>}
            >
              <p className="text-text-2">
                Record detail body — fields save optimistically with field-level
                spinners at the call site.
              </p>
            </Inspector>
          </Variant>
        </Section>

        <Section title="CommandPalette">
          <Variant label="MI-1 — ⌘K also works globally on this page">
            <Button kind="quiet" onClick={() => setPaletteOpen(true)}>
              Open palette (⌘K)
            </Button>
            <CommandPalette
              open={paletteOpen}
              onOpenChange={setPaletteOpen}
              items={[
                {
                  id: "r1",
                  label: "Fuel — Lekki toll gate",
                  group: "recent",
                  onSelect: () => undefined,
                },
                {
                  id: "a1",
                  label: "Upload statement",
                  group: "action",
                  shortcut: ["⌘", "U"],
                  onSelect: () => undefined,
                },
                {
                  id: "a2",
                  label: "New transaction",
                  group: "action",
                  onSelect: () => undefined,
                },
                {
                  id: "a3",
                  label: "New category",
                  group: "action",
                  onSelect: () => undefined,
                },
                {
                  id: "n1",
                  label: "Go to Transactions",
                  group: "navigate",
                  onSelect: () => undefined,
                },
                {
                  id: "n2",
                  label: "Go to Reports",
                  group: "navigate",
                  onSelect: () => undefined,
                },
              ]}
            />
          </Variant>
        </Section>

        <Section title="WizardShell + WizardStep">
          <Variant label="vertical rail + sticky summary (MI-10)">
            <div className="w-full rounded border border-border p-4">
              <WizardShell
                steps={
                  <>
                    <WizardStep state="done" label="Tax profile" index={1} />
                    <WizardStep state="current" label="Data review" index={2} />
                    <WizardStep state="todo" label="Generate forms" index={3} />
                    <WizardStep state="error" label="Submit" index={4} />
                  </>
                }
                summary={
                  <div className="text-[13px]">
                    <div className="font-medium">PIT · FY2026</div>
                    <div className="mt-1 tabular-nums text-text-2">
                      Est. due: ₦342,500.00
                    </div>
                  </div>
                }
              >
                <p className="text-sm text-text-2">Wizard step content…</p>
              </WizardShell>
            </div>
          </Variant>
          <Variant label="horizontal status stepper + with-progress (MI-9)">
            <div className="flex items-center gap-6">
              <WizardStep
                state="done"
                label="Connect"
                index={1}
                orientation="horizontal"
              />
              <WizardStep
                state="done"
                label="Consent"
                index={2}
                orientation="horizontal"
              />
              <WizardStep
                state="current"
                label="Syncing"
                index={3}
                orientation="horizontal"
                progress={
                  <ProgressBar
                    size="sm"
                    value={62}
                    label="Synced 124 transactions"
                  />
                }
              />
              <WizardStep
                state="todo"
                label="Done"
                index={4}
                orientation="horizontal"
              />
            </div>
          </Variant>
        </Section>

        <Section title="EmptyState">
          <Variant label="five kinds · demo-data toggle (MI-16)">
            <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-2">
              <EmptyState
                kind="transactions"
                demoToggle={{ enabled: false, onChange: () => undefined }}
              />
              <EmptyState kind="imports" />
              <EmptyState kind="accounts" />
              <EmptyState kind="ratios" />
              <EmptyState kind="tax" />
            </div>
          </Variant>
        </Section>

        <Section title="FormRow">
          <Variant label="default / helper / error / disabled / required">
            <div className="w-full max-w-md space-y-3">
              <FormRow
                label="State of residence"
                helper="Resolves your State IRS (e.g. LIRS)"
              >
                {(id) => <Input id={id} name="g-state" placeholder="Lagos" />}
              </FormRow>
              <FormRow
                label="TIN"
                required
                error="Required for filing (tax_identity_incomplete)"
              >
                {(id) => <Input id={id} name="g-tin2" />}
              </FormRow>
              <FormRow label="RC number" disabled>
                {(id) => <Input id={id} name="g-rc" disabled />}
              </FormRow>
            </div>
          </Variant>
        </Section>

        <Section title="ManualStatementRow">
          <Variant label="default / error (identity check)">
            <ul className="w-full max-w-xl list-none space-y-3">
              <ManualStatementRow
                keyOptions={BALANCE_SHEET_KEYS}
                canonicalKey={comboValue as never}
                amount="1250000"
                onKeyChange={(key) => setComboValue(key)}
                onRemove={() => undefined}
              />
              <ManualStatementRow
                keyOptions={BALANCE_SHEET_KEYS}
                canonicalKey={"total_assets" as never}
                amount="5000000"
                error="Assets must equal liabilities + equity"
              />
            </ul>
          </Variant>
        </Section>

        <Section title="RemitToCard">
          <Variant label="pit / cit / vat">
            <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-3">
              <RemitToCard
                kind="pit"
                authority={lirs}
                amountDue={342500.75}
                dueDate="2027-03-31"
              />
              <RemitToCard
                kind="cit"
                authority={{
                  code: "FIRS",
                  name: "Federal Inland Revenue Service",
                  payment_channels: ["TaxPro-Max"],
                }}
                amountDue={1250000}
                dueDate="2027-06-30"
              />
              <RemitToCard
                kind="vat"
                authority={{
                  code: "FIRS",
                  name: "Federal Inland Revenue Service",
                  payment_channels: ["TaxPro-Max", "Remita"],
                }}
                amountDue={87500}
                dueDate="2026-07-21"
                daysToDue={1}
              />
            </div>
          </Variant>
        </Section>

        <Section title="TaxCalendarRow">
          <Variant label="none / T-30 / T-7 / T-1 escalation (MI-13)">
            <ul className="w-full list-none space-y-2">
              {[60, 25, 6, 1].map((days) => (
                <TaxCalendarRow
                  key={days}
                  entry={{
                    kind: "vat",
                    period: "2026-06",
                    due_date: "2026-07-21",
                    authority: {
                      code: "FIRS",
                      name: "Federal Inland Revenue Service",
                      payment_channels: [],
                    },
                  }}
                  daysToDue={days}
                />
              ))}
            </ul>
          </Variant>
        </Section>

        <Section title="StatementView">
          <Variant label="balance_sheet · derived flag · mapping warnings · period selector">
            <div className="w-full max-w-xl">
              <StatementView
                kind="balance_sheet"
                period="2026-Q2"
                lineItems={statementItems}
                mappingWarnings={["identity check off by ₦12,000"]}
                formulaNotes={{
                  equity: "total_assets − total_liabilities",
                }}
                periodSelector={
                  <div className="w-40">
                    <PeriodPicker
                      mode="quarter"
                      value={period}
                      onValueChange={setPeriod}
                      presets={[
                        { label: "Q1 2026", value: "2026-Q1" },
                        { label: "Q2 2026", value: "2026-Q2" },
                      ]}
                    />
                  </div>
                }
              />
            </div>
          </Variant>
        </Section>

        <Section title="MappingReviewRow">
          <Variant label="suggested (✨ n%) / confirmed / unmapped (<60%)">
            <ul className="w-full list-none rounded border border-border">
              <MappingReviewRow
                row={mappingRow("suggested")}
                keyOptions={BALANCE_SHEET_KEYS}
                onConfirm={() => undefined}
              />
              <MappingReviewRow
                row={mappingRow("confirmed")}
                keyOptions={BALANCE_SHEET_KEYS}
              />
              <MappingReviewRow
                row={mappingRow("unmapped")}
                keyOptions={BALANCE_SHEET_KEYS}
              />
            </ul>
          </Variant>
        </Section>

        <Section title="AppNav / NavItem + OrgSwitcher">
          <Variant label="expanded 240px / collapsed 64px · badge (MI-5) · org-switcher slot">
            <div className="flex h-80 w-full gap-4 overflow-hidden rounded border border-border">
              <AppNav
                collapsed={navCollapsed}
                onCollapsedChange={setNavCollapsed}
                orgSwitcher={
                  <OrgSwitcher
                    orgs={orgs}
                    currentOrgId="org-c"
                    compact={navCollapsed}
                    onCreate={() => undefined}
                  />
                }
              >
                <NavGroupLabel>Workspace</NavGroupLabel>
                <NavItem icon={LayoutDashboard} label="Overview" active />
                <NavItem
                  icon={ArrowLeftRight}
                  label="Transactions"
                  badgeCount={3}
                />
                <NavItem icon={Upload} label="Imports" />
                <NavItem icon={Landmark} label="Accounts" />
                <NavGroupLabel>Company</NavGroupLabel>
                <NavItem icon={Gauge} label="Ratios" />
                <NavItem icon={Banknote} label="Taxes" />
                <NavItem icon={Users} label="Members" />
              </AppNav>
              <div className="flex-1 p-4 text-[13px] text-text-2">
                Content area — toggle the rail with the collapse control.
              </div>
            </div>
          </Variant>
        </Section>

        <Section title="Select / Menu">
          <Variant label="md · sm · searchable combobox · error · disabled">
            <div className="w-52">
              <Select
                options={[
                  { value: "pdf", label: "PDF" },
                  { value: "csv", label: "CSV" },
                  { value: "json", label: "JSON" },
                ]}
                value={selectValue}
                onValueChange={setSelectValue}
                placeholder="Report format"
              />
            </div>
            <div className="w-40">
              <Select
                options={[
                  { value: "admin", label: "Admin" },
                  { value: "member", label: "Member" },
                ]}
                value="member"
                size="sm"
              />
            </div>
            <div className="w-64">
              <Select
                options={BALANCE_SHEET_KEYS.map((key) => ({
                  value: key,
                  label: key,
                  mono: true,
                }))}
                value={null}
                searchable
                placeholder="canonical_key"
              />
            </div>
            <div className="w-52">
              <Select options={[]} value={null} error="Required" />
            </div>
            <div className="w-52">
              <Select
                options={[]}
                value={null}
                disabled
                placeholder="Disabled"
              />
            </div>
          </Variant>
        </Section>

        <Section title="PeriodPicker">
          <Variant label="quarter (presets) · month · year · error">
            <div className="w-48">
              <PeriodPicker
                mode="quarter"
                value={period}
                onValueChange={setPeriod}
                presets={[
                  { label: "Q1 2026", value: "2026-Q1" },
                  { label: "Q2 2026", value: "2026-Q2" },
                ]}
              />
            </div>
            <div className="w-48">
              <PeriodPicker mode="month" value="2026-06" />
            </div>
            <div className="w-48">
              <PeriodPicker mode="year" value="FY2026" />
            </div>
            <div className="w-48">
              <PeriodPicker mode="month" value={null} error="Pick a period" />
            </div>
          </Variant>
        </Section>

        <Section title="Modal / Dialog">
          <Variant label="md · danger typed-confirm (MI-15) · sheet">
            <Button kind="quiet" onClick={() => setModalOpen(true)}>
              Open modal
            </Button>
            <Button kind="destructive" onClick={() => setDangerOpen(true)}>
              Open danger modal
            </Button>
            <Button kind="quiet" onClick={() => setSheetOpen(true)}>
              Open sheet
            </Button>
            <Modal
              open={modalOpen}
              onOpenChange={setModalOpen}
              title="Invite member"
              description="They get access to this org's ledger"
              footer={<Button size="sm">Send invite</Button>}
            >
              <Input
                label="Email"
                name="g-invite"
                placeholder="ada@company.ng"
              />
            </Modal>
            <Modal
              open={dangerOpen}
              onOpenChange={setDangerOpen}
              title="Purge all data"
              description="This permanently deletes every transaction"
              variant="danger"
              confirmPhrase="personal-org"
              confirmLabel="Purge"
              onConfirm={() => setDangerOpen(false)}
            >
              This cannot be undone.
            </Modal>
            <Modal
              open={sheetOpen}
              onOpenChange={setSheetOpen}
              title="AI consent"
              variant="sheet"
            >
              <p className="text-text-2">
                Sheet variant — right-anchored, used by the B0 consent flow.
              </p>
            </Modal>
          </Variant>
        </Section>

        <Section title="Tooltip / Kbd">
          <Variant label="text · formula (MI-8) · single key · chord">
            <Tooltip content="Edit category">
              <Button kind="quiet" size="sm">
                Hover: text
              </Button>
            </Tooltip>
            <Tooltip
              kind="formula"
              content="Current ratio = current assets ÷ current liabilities"
            >
              <Button kind="quiet" size="sm">
                Hover: formula
              </Button>
            </Tooltip>
            <Kbd keys="K" />
            <Kbd keys={["⌘", "K"]} />
          </Variant>
        </Section>

        <Section title="Tag / Badge">
          <Variant label="six tints × text · count (9+ cap) · sm/md">
            <Tag tint="neutral">Neutral</Tag>
            <Tag tint="info">Info</Tag>
            <Tag tint="warn">Warn</Tag>
            <Tag tint="error">Error</Tag>
            <Tag tint="success">Success</Tag>
            <Tag tint="new-accent">NEW</Tag>
            <Tag tint="warn" count={3} />
            <Tag tint="warn" count={12} />
            <Tag tint="info" size="md">
              md size
            </Tag>
          </Variant>
        </Section>

        <Section title="Checkbox / Radio / Switch / SegmentedControl">
          <Variant label="checkbox states">
            <Checkbox
              checked={checkbox}
              onCheckedChange={setCheckbox}
              label="Select all"
            />
            <Checkbox checked="indeterminate" label="Indeterminate" />
            <Checkbox checked disabled label="Disabled" />
          </Variant>
          <Variant label="radio · choice-card">
            <div className="w-80">
              <Radio
                value={radio}
                onValueChange={setRadio}
                variant="choice-card"
                options={[
                  {
                    value: "keep",
                    label: "Keep transactions",
                    description: "Unlink only — imported rows stay",
                  },
                  {
                    value: "purge",
                    label: "Purge transactions",
                    description: "Deletes every imported row from this link",
                  },
                ]}
              />
            </div>
          </Variant>
          <Variant label="switch · segmented (density preset)">
            <Switch
              checked={switchOn}
              onCheckedChange={setSwitchOn}
              label="Auto-confirm"
              helper="After 3 clean syncs"
            />
            <SegmentedControl
              aria-label="Density"
              options={[
                { value: "compact", label: "Compact" },
                { value: "comfortable", label: "Comfortable" },
              ]}
              value={segment}
              onValueChange={setSegment}
            />
            <SegmentedControl
              aria-label="Density (disabled)"
              options={[
                { value: "compact", label: "Compact" },
                { value: "comfortable", label: "Comfortable" },
              ]}
              value="compact"
              disabled
            />
          </Variant>
        </Section>

        <Section title="Tabs + TabItem / Accordion">
          <Variant label="underline (app) · pill (marketing)">
            <div className="w-full max-w-md">
              <Tabs
                value={tab}
                onValueChange={setTab}
                aria-label="Settings"
                items={
                  <>
                    <TabItem value="profile">Profile</TabItem>
                    <TabItem value="members">Members</TabItem>
                    <TabItem value="rights" disabled>
                      Rights
                    </TabItem>
                  </>
                }
              >
                <TabPanel value="profile">Profile panel</TabPanel>
                <TabPanel value="members">Members panel</TabPanel>
              </Tabs>
            </div>
            <div className="w-full max-w-md">
              <Tabs
                value="freelancer"
                kind="pill"
                aria-label="Personas"
                items={
                  <>
                    <TabItem value="freelancer" kind="pill">
                      Freelancer
                    </TabItem>
                    <TabItem value="sme" kind="pill">
                      SME
                    </TabItem>
                    <TabItem value="company" kind="pill">
                      Company
                    </TabItem>
                  </>
                }
              />
            </div>
          </Variant>
          <Variant label='accordion · trace ("how we got this")'>
            <div className="w-full max-w-md">
              <Accordion
                defaultOpen={["trace"]}
                items={[
                  {
                    id: "trace",
                    title: "How we got this",
                    content:
                      "taxable_income = gross_income − exempt(cat: Reimbursements)",
                    variant: "trace",
                  },
                  {
                    id: "plain",
                    title: "What counts as income?",
                    content:
                      "Inflows excluding transfers between your own accounts.",
                  },
                ]}
              />
            </div>
          </Variant>
        </Section>

        <Section title="Avatar / ProgressBar / Skeleton / StampedCheck / ColorSwatchPicker">
          <Variant label="avatar image / initials / icon · xs/sm/md">
            <Avatar name="Ada Obi" size="md" />
            <Avatar name="Chidi Eze" size="sm" />
            <Avatar size="xs" />
          </Variant>
          <Variant label="progress determinate / indeterminate / label">
            <div className="w-64 space-y-3">
              <ProgressBar value={62} label="Synced 124 transactions" />
              <ProgressBar size="sm" />
            </div>
          </Variant>
          <Variant label="skeleton row (density ×2) / chart / stat / text (MI-12)">
            <div className="w-full max-w-md space-y-3">
              <Skeleton variant="row" density="comfortable" />
              <Skeleton variant="row" density="compact" />
              <Skeleton variant="chart" className="h-24" />
              <Skeleton variant="stat" />
              <Skeleton variant="text" className="w-40" />
            </div>
          </Variant>
          <Variant label="stamped-check md/lg (MI-10) · swatch picker (B8)">
            <StampedCheck size="md" />
            <StampedCheck size="lg" />
            <ColorSwatchPicker
              presets={["#2456D6", "#1B7F4B", "#F46A1F", "#B26A00", "#C6373C"]}
              value={swatch}
              onValueChange={setSwatch}
            />
          </Variant>
        </Section>

        <Section title="TableHeader / BulkActionBar / StagedReviewHeader">
          <Variant label="sort axis · select-all · sticky (see TxnTableRow section)">
            <div className="w-full rounded border border-border">
              <TableHeader
                density="compact"
                columns={[
                  {
                    id: "date",
                    label: "Date",
                    sortable: true,
                    widthClass: "w-24",
                  },
                  { id: "desc", label: "Description" },
                  {
                    id: "amt",
                    label: "Amount",
                    numeric: true,
                    sortable: true,
                    widthClass: "w-28",
                  },
                ]}
                sort={{ columnId: "amt", direction: "asc" }}
                selectAll={{
                  checked: "indeterminate",
                  onCheckedChange: () => undefined,
                }}
              />
            </div>
          </Variant>
          <Variant label="bulk bar (visible)">
            <BulkActionBar selectedCount={12} />
          </Variant>
          <Variant label="staged review — reviewing / committing (MI-3)">
            <div className="w-full space-y-4">
              <StagedReviewHeader
                importCount={209}
                duplicateCount={5}
                warnings={
                  <Banner kind="warn">3 rows were partially extracted</Banner>
                }
              />
              <StagedReviewHeader
                importCount={209}
                duplicateCount={5}
                state="committing"
              />
            </div>
          </Variant>
        </Section>

        <Section title="GoogleAuthButton">
          <Variant label="default / loading / disabled (the single X-1 CTA)">
            <div className="w-72 space-y-2">
              <GoogleAuthButton />
              <GoogleAuthButton loading />
              <GoogleAuthButton disabled />
            </div>
          </Variant>
        </Section>

        <Section title="Chart/Line + Chart/Donut">
          <Variant label="line: data (12mo cash-flow) / loading / empty">
            <div className="w-full max-w-xl space-y-4">
              <ChartLine
                series={[
                  {
                    id: "income",
                    label: "Income",
                    color: "income",
                    points: [4, 6, 5, 9, 7, 10, 8, 12, 11, 13, 12, 15],
                  },
                  {
                    id: "expense",
                    label: "Expense",
                    color: "expense",
                    points: [3, 4, 4, 6, 5, 7, 6, 8, 7, 9, 8, 10],
                  },
                ]}
                xLabels={["Jul", "Sep", "Nov", "Jan", "Mar", "Jun"]}
              />
              <ChartLine state="loading" />
            </div>
          </Variant>
          <Variant label="donut: legend right / bottom / none · center total">
            <ChartDonut
              slices={[
                {
                  id: "transport",
                  label: "Transport",
                  value: 40,
                  color: "#2456D6",
                },
                {
                  id: "groceries",
                  label: "Groceries",
                  value: 35,
                  color: "#1B7F4B",
                },
                { id: "other", label: "Other", value: 25, color: "#B26A00" },
              ]}
              centerTotal="₦412k"
              centerCaption="June"
              legend="right"
            />
            <ChartDonut
              slices={[
                { id: "a", label: "Rent", value: 60, color: "#C6373C" },
                { id: "b", label: "Payroll", value: 40, color: "#2456D6" },
              ]}
              centerTotal="₦2.1m"
              legend="bottom"
            />
          </Variant>
        </Section>

        <Section title="MemberRow / ImportJobRow / ReportArtifactRow / FilingHistoryRow">
          <Variant label="member: owner / default / pending-invite">
            <ul className="w-full list-none rounded border border-border">
              {members.map((member) => (
                <MemberRow
                  key={member.user_id}
                  member={member}
                  onRemove={() => undefined}
                />
              ))}
            </ul>
          </Variant>
          <Variant label="import jobs: five statuses">
            <ul className="w-full list-none rounded border border-border">
              <ImportJobRow job={importJob({ status: "processing" })} />
              <ImportJobRow job={importJob()} />
              <ImportJobRow
                job={importJob({
                  total_parsed: 0,
                  imported: 0,
                  anomalies: [],
                  duplicates_found: 0,
                })}
              />
              <ImportJobRow
                job={importJob({ source: "bank_sync", file_name: null })}
              />
              <ImportJobRow
                job={importJob({
                  status: "failed",
                  error_code: "unreadable_file",
                })}
              />
            </ul>
          </Variant>
          <Variant label="report artifacts: generating / ready / NEW / expired (MI-14)">
            <ul className="w-full list-none rounded border border-border">
              <ReportArtifactRow
                artifact={artifact({ status: "generating" })}
              />
              <ReportArtifactRow artifact={artifact()} />
              <ReportArtifactRow
                artifact={artifact({ kind: "cash_movement", format: "csv" })}
                isNew
              />
              <ReportArtifactRow
                artifact={artifact({ status: "expired", kind: "full_export" })}
              />
            </ul>
          </Variant>
          <Variant label="filing history: accepted (stamped ✓) / draft">
            <ul className="w-full list-none rounded border border-border">
              <FilingHistoryRow filing={filing()} />
              <FilingHistoryRow
                filing={filing({
                  id: "tf-2",
                  kind: "vat",
                  period: "2026-06",
                  status: "draft",
                  artifact_key: null,
                })}
              />
            </ul>
          </Variant>
        </Section>

        <Section title="MarketingNav / MarketingFooter">
          <Variant label="on-dark (hero) / dark-on-light (sticky)">
            <div className="w-full space-y-3">
              <MarketingNav
                variant="on-dark"
                links={[{ label: "Docs", href: "#" }]}
                solutions={[
                  { label: "Freelancers", href: "#" },
                  { label: "SMEs", href: "#" },
                  { label: "Companies", href: "#" },
                ]}
              />
              <MarketingNav
                variant="dark-on-light"
                links={[{ label: "Docs", href: "#" }]}
                className="!static"
              />
            </div>
          </Variant>
          <Variant label="footer — dark, link columns, security CTA">
            <div className="w-full">
              <MarketingFooter
                columns={[
                  {
                    heading: "Product",
                    links: [
                      { label: "Features", href: "#" },
                      { label: "Self-host", href: "#" },
                    ],
                  },
                  {
                    heading: "Company",
                    links: [{ label: "About", href: "#" }],
                  },
                  {
                    heading: "Community",
                    links: [
                      { label: "GitHub", href: "#" },
                      { label: "Contributing", href: "#" },
                    ],
                  },
                  {
                    heading: "Legal",
                    links: [
                      { label: "Privacy", href: "#" },
                      { label: "Terms", href: "#" },
                    ],
                  },
                ]}
              />
            </div>
          </Variant>
        </Section>

        <Section title="CodeSnippet / EditorialCard / ComparisonTable">
          <Variant label="code — mono on dark, copy morph">
            <div className="w-full max-w-md">
              <CodeSnippet
                code={
                  "git clone https://github.com/cuesoftinc/expendit\ncd expendit && docker compose up -d"
                }
              />
            </div>
          </Variant>
          <Variant label="editorial: pillar / community (hover for lift + underline)">
            <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-2">
              <EditorialCard
                kind="pillar"
                eyebrow="Ledger"
                title="Numbers are the product"
                body="Tabular numerals everywhere, right-aligned money columns, austere charts."
                icon={TagIcon}
                href="#"
              />
              <EditorialCard
                kind="community"
                eyebrow="Open source"
                title="Contribute"
                body="Good-first-issues across the Go API and the Next.js web app."
                icon={Users}
                href="#"
              />
            </div>
          </Variant>
          <Variant label="comparison — Cloud vs Self-host + pricing caption">
            <div className="w-full max-w-xl">
              <ComparisonTable
                rows={[
                  {
                    feature: "AI categorization",
                    cloud: { kind: "check" },
                    selfHost: { kind: "check" },
                  },
                  {
                    feature: "Bank sync (Mono)",
                    cloud: { kind: "check" },
                    selfHost: { kind: "check" },
                  },
                  {
                    feature: "Managed upgrades",
                    cloud: { kind: "check" },
                    selfHost: { kind: "x" },
                  },
                  {
                    feature: "Your own infrastructure",
                    cloud: { kind: "x" },
                    selfHost: { kind: "check" },
                  },
                  {
                    feature: "Price",
                    cloud: { kind: "text", text: "Announced at GA" },
                    selfHost: { kind: "text", text: "Free forever" },
                  },
                ]}
                cloudCta={<Button size="sm">Try Cloud</Button>}
                selfHostCta={
                  <Button size="sm" kind="quiet">
                    Read the docs
                  </Button>
                }
              />
            </div>
          </Variant>
        </Section>
      </main>
    </div>
  );
};
