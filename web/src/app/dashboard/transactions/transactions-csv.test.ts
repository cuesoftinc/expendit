import type { TxnEntry } from "@/models";
import { describe, expect, it } from "vitest";
import { transactionsCsv } from "./transactions-csv";

const txn: TxnEntry = {
  id: "txn-1",
  org_id: "org-1",
  txn_date: "2026-11-15",
  description: "Office supplies",
  category_id: "cat-1",
  direction: "expense",
  amount: 1234.56,
  source: "manual",
  source_link_id: null,
  ai_categorized: false,
  excluded_from_reports: false,
  anomalies: [],
  created_at: "2026-11-15T00:00:00Z",
};
const categories = new Map([["cat-1", { name: "Office" }]]);
const header =
  '"date","description","category","direction","amount","currency"';

describe("transactionsCsv", () => {
  it("quotes every cell and preserves column order, row order and numeric data", () => {
    expect(
      transactionsCsv(
        [
          txn,
          { ...txn, description: "Salary", direction: "income", amount: 5000 },
        ],
        categories,
        "NGN",
      ),
    ).toBe(
      header +
        '\r\n"2026-11-15","Office supplies","Office","expense","1234.56","NGN"' +
        '\r\n"2026-11-15","Salary","Office","income","5000","NGN"',
    );
  });

  it("neutralizes a HYPERLINK payee and preserves a comma in the category", () => {
    expect(
      transactionsCsv(
        [{ ...txn, description: '=HYPERLINK("https://example.com","Click")' }],
        new Map([["cat-1", { name: "Office, supplies" }]]),
        "NGN",
      ),
    ).toBe(
      header +
        '\r\n"2026-11-15","\'=HYPERLINK(""https://example.com"",""Click"")","Office, supplies","expense","1234.56","NGN"',
    );
  });

  it.each(["=1+1", "+1+1", "-1+1", "@SUM(A1)", "\tformula", "\rformula"])(
    "guards every text column starting with %j",
    (value) => {
      expect(
        transactionsCsv(
          [{ ...txn, txn_date: value, description: value, category_id: value }],
          new Map(),
          value,
        ),
      ).toBe(
        `${header}\r\n"'${value}","'${value}","'${value}","expense","1234.56","'${value}"`,
      );
      expect(
        transactionsCsv([txn], new Map([["cat-1", { name: value }]]), "NGN"),
      ).toContain(`,"'${value}","expense",`);
    },
  );

  it("doubles quotes and preserves embedded commas, LF and CRLF", () => {
    expect(
      transactionsCsv(
        [{ ...txn, description: 'A "quoted", payee\nsecond\r\nthird' }],
        new Map([["cat-1", { name: 'The "office"' }]]),
        'N"GN',
      ),
    ).toBe(
      header +
        '\r\n"2026-11-15","A ""quoted"", payee\nsecond\r\nthird","The ""office""","expense","1234.56","N""GN"',
    );
  });

  it("preserves empty cells and zero amounts", () => {
    expect(
      transactionsCsv(
        [{ ...txn, description: "", category_id: "", amount: 0 }],
        new Map(),
        "",
      ),
    ).toBe(header + '\r\n"2026-11-15","","","expense","0",""');
    expect(transactionsCsv([], categories, "NGN")).toBe(header);
  });

  it("preserves finite negative amounts as numbers rather than import-breaking text", () => {
    expect(
      transactionsCsv([{ ...txn, amount: -1234.56 }], categories, "NGN"),
    ).toBe(
      header +
        '\r\n"2026-11-15","Office supplies","Office","expense","-1234.56","NGN"',
    );
  });
});
