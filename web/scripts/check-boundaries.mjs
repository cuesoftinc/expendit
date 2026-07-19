#!/usr/bin/env node
/**
 * Boundary gates (web-implementation.md §8 + §9 acceptance):
 *
 *   1. No styled-kit imports (@mui/@emotion) anywhere — the packages
 *      were pruned with the MUI retirement (2026-07-19); the gate stays
 *      so a reintroduction fails fast. src/legacy/ (empty) remains the
 *      quarantine mechanism for future replacements.
 *   2. Live code never imports from src/legacy/ (dead-code gate).
 *   3. No raw hex in components outside the token layer — documented
 *      data-value exceptions carry a code comment on the line or the
 *      line above (design.md §7 / web standard §1).
 *   4. MVC: the repositories client is the only fetch() call site in the
 *      browser bundle (views/controllers never fetch; the mock server is
 *      server-side and exempt).
 *
 * Wired into `npm run lint` (CI runs lint — workflow untouched).
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const SRC = join(ROOT, "src");

const failures = [];

const walk = (dir, files = []) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue;
      walk(path, files);
    } else if (/\.(ts|tsx|css)$/.test(entry.name)) {
      files.push(path);
    }
  }
  return files;
};

const files = walk(SRC);
const rel = (path) => relative(ROOT, path);
const inLegacy = (path) => rel(path).startsWith(["src", "legacy"].join(sep));

for (const file of files) {
  const path = rel(file);
  const text = readFileSync(file, "utf8");
  const lines = text.split("\n");

  // 1. Styled-kit imports — forbidden repo-wide since the MUI prune.
  if (/from ["']@(mui|emotion)\//.test(text)) {
    failures.push(`${path}: @mui/@emotion import (pruned styled kits)`);
  }

  // 2. Live code importing quarantined trees.
  if (
    !inLegacy(file) &&
    /from ["'](@\/legacy\/|\.\.?\/.*\/legacy\/)/.test(text)
  ) {
    failures.push(`${path}: imports from src/legacy/ (quarantined)`);
  }

  // 3. Raw hex in components/ (token rule) — comment-carrying lines are
  //    the documented exceptions (data values like registry colors).
  if (
    !inLegacy(file) &&
    path.startsWith(["src", "components"].join(sep)) &&
    !path.endsWith(".css")
  ) {
    lines.forEach((line, index) => {
      if (!/#[0-9a-fA-F]{3,8}\b/.test(line)) return;
      // Documented exception classes (design.md §7 / §8.1 icon note):
      //   - `color:`/`color=` data fields — registry/demo category colors
      //     are data, not styling (donut slices, chips).
      //   - `fill="#…"` — approved brand glyphs (Google 'G', GitHub mark)
      //     are local SVGs outside the Lucide/token system.
      if (/color["']?\s*[:=]/.test(line) || /fill=["']#/.test(line)) return;
      const prev = lines[index - 1] ?? "";
      const documented = /\/\/|\/\*|\*/.test(line) || /\/\/|\/\*|\*/.test(prev);
      if (!documented && !path.includes(".test.")) {
        failures.push(
          `${path}:${index + 1}: raw hex without a documenting comment`,
        );
      }
    });
  }

  // 4. fetch() outside the repositories client (mock server exempt —
  //    it is server-side route-handler code, not a view).
  const isClient =
    path === ["src", "models", "repositories", "client.ts"].join(sep);
  // W2 as-built exception: the GitHub star count is a third-party public
  // API read (pages.md A8 — populated at runtime), not our API surface.
  const isGithubStars =
    path === ["src", "controllers", "use-github-stars.ts"].join(sep);
  const isMock =
    path.startsWith(["src", "app", "api", "mock"].join(sep)) ||
    path.startsWith(["src", "mock"].join(sep));
  if (
    !inLegacy(file) &&
    !isClient &&
    !isMock &&
    !isGithubStars &&
    !path.includes(".test.") &&
    /[^a-zA-Z.]fetch\(/.test(text)
  ) {
    failures.push(`${path}: fetch() outside the repositories client (MVC)`);
  }
}

if (failures.length > 0) {
  console.error(
    "check:boundaries failed:\n" + failures.map((f) => `  - ${f}`).join("\n"),
  );
  process.exit(1);
}
console.log(`check:boundaries ok (${files.length} files)`);
