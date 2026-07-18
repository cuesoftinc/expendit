/**
 * Mock-server store — a seeded in-memory database behind a module/global
 * singleton (dev-persistent across HMR). The mock route handlers under
 * src/app/api/mock/* are the only consumers; contract types are shared
 * with src/models (web standard — mock server).
 */

import type {
  BankLink,
  Category,
  ConsentRecord,
  ExportJob,
  FinStatement,
  ImportJob,
  LineItem,
  Member,
  Org,
  PurgeRequest,
  RatioReport,
  ReportArtifact,
  StagedTransaction,
  TaxEstimate,
  TaxFiling,
  TaxProfile,
  TxnEntry,
} from "@/models";
import { buildSeed } from "./seed";

export interface MockDb {
  orgs: Org[];
  members: Member[];
  categories: Category[];
  transactions: TxnEntry[];
  importJobs: ImportJob[];
  stagedTxns: StagedTransaction[];
  bankLinks: BankLink[];
  statements: FinStatement[];
  lineItems: LineItem[];
  ratioReports: RatioReport[];
  taxProfiles: TaxProfile[];
  taxEstimates: TaxEstimate[];
  taxFilings: TaxFiling[];
  artifacts: ReportArtifact[];
  consents: ConsentRecord[];
  exportJobs: ExportJob[];
  purgeRequest: PurgeRequest | null;
  /** Idempotency-Key → created resource id (24h window abstracted away). */
  idempotency: Record<string, string>;
  /** link id → real-clock ms of the last manual sync (rate limiting). */
  lastManualSync: Record<string, number>;
  /** Real-clock ms a processing job/statement was created (lifecycle). */
  processingSince: Record<string, number>;
  seq: number;
}

const GLOBAL_KEY = "__expenditMockDb" as const;

type GlobalWithDb = typeof globalThis & { [GLOBAL_KEY]?: MockDb };

export const getDb = (): MockDb => {
  const g = globalThis as GlobalWithDb;
  if (!g[GLOBAL_KEY]) g[GLOBAL_KEY] = buildSeed();
  return g[GLOBAL_KEY];
};

/** Reset to the pristine seed (test seam; idempotent). */
export const resetDb = (): MockDb => {
  const g = globalThis as GlobalWithDb;
  g[GLOBAL_KEY] = buildSeed();
  return g[GLOBAL_KEY];
};

export const nextId = (prefix: string): string => {
  const db = getDb();
  db.seq += 1;
  return `${prefix}-${db.seq.toString().padStart(4, "0")}`;
};
