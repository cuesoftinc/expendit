#!/usr/bin/env node
/**
 * check:boundaries — the shared cross-repo boundary gate (org web standard),
 * wired into `npm run lint`. This file is byte-identical across apparule,
 * expendit and upstat; the only repo-specific part is the rule list in the
 * marked config section below, selected by the `name` field of
 * web/package.json.
 *
 * Rule library (the superset of the three repos' historical gates):
 *   - legacyImport        live code never imports src/legacy (quarantine —
 *                         src/legacy stays the mechanism for future
 *                         replacements even while the tree is empty)
 *   - forbiddenImports    package prefixes banned repo-wide (pruned kits)
 *   - rawHex              no raw hex outside the token layer; documented
 *                         exceptions only (design.md §7 per repo)
 *   - fetchOnlyIn         fetch() confined to the repositories client (MVC —
 *                         views/controllers never fetch)
 *   - viewBoundaries      views never fetch or import repositories/gRPC;
 *                         controllers never fetch (MVC network seam)
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

// ─────────────────────────────────────────────────────────────────────────
// Per-repo rule lists — the ONLY repo-specific section. Keys are package
// names; every entry ships in every repo so the file stays byte-identical.
// ─────────────────────────────────────────────────────────────────────────
const REPO_RULES = {
  apparule: [legacyImport()],
  expendit: [
    legacyImport(),
    forbiddenImports(
      ["@mui", "@emotion"],
      "pruned styled kits (MUI retirement, web-implementation.md §8)",
    ),
    rawHex({
      // Token rule scope: components/, excluding stylesheets.
      scope: (path) =>
        path.startsWith("src/components/") && !path.endsWith(".css"),
      // Documented exception classes (design.md §7 / §8.1 icon note):
      // `color:`/`color=` data fields (registry/demo category colors are
      // data, not styling) and `fill="#…"` brand glyphs (local SVGs outside
      // the Lucide/token system).
      allowLinePatterns: [/color["']?\s*[:=]/, /fill=["']#/],
      // Any hex is allowed when the line (or the line above) carries a
      // documenting comment.
      commentedException: "any",
      allowFileSuffixes: [],
    }),
    fetchOnlyIn({
      // The repositories client is the only fetch() call site in the
      // browser bundle. use-github-stars is the W2 as-built exception — a
      // third-party public API read (pages.md A8), not our API surface.
      files: [
        "src/models/repositories/client.ts",
        "src/controllers/use-github-stars.ts",
      ],
      // The mock server is server-side route-handler code, not a view.
      prefixes: ["src/app/api/mock", "src/mock"],
    }),
  ],
  upstat: [
    legacyImport(),
    viewBoundaries({
      // Views: src/app/** minus the mock server (src/app/api/**).
      isView: (path) =>
        path.startsWith("src/app/") && !path.startsWith("src/app/api/"),
      isController: (path) => path.startsWith("src/controllers/"),
      // No repository imports and no gRPC/proto imports in views (MVC + the
      // X-8 control-plane exception lives behind the repositories).
      viewForbiddenImports: [
        /from\s+["']@\/models\/repositories/,
        /from\s+["'](@\/proto|@\/client|grpc-web|google-protobuf)/,
      ],
    }),
    rawHex({
      // Token rule scope (design.md §7): ui primitives + view markup/styles.
      scope: (path) =>
        path.startsWith("src/components/ui/") ||
        (path.startsWith("src/app/") &&
          !path.startsWith("src/app/api/") &&
          /\.(tsx|css)$/.test(path)),
      allowLinePatterns: [],
      // §2 on-crit: only raw white passes, and only when the line (or the
      // line above) carries the documenting comment.
      commentedException: "white-only",
      // The GoogleAuthButton brand glyph is the documented file-level
      // exception.
      allowFileSuffixes: ["GoogleAuthButton.tsx"],
    }),
  ],
};

// ─────────────────────────────────────────────────────────────────────────
// Engine — shared walker + rule factories (no repo-specific code below).
// ─────────────────────────────────────────────────────────────────────────

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SRC = join(ROOT, "src");

const toPosix = (path) => path.split(sep).join("/");
const isTestFile = (path) => path.includes(".test.");
const isPureComment = (line) => /^\s*(\/\/|\*|\/\*)/.test(line);
// A line "documents" a hex value when it (or the line above) carries a
// comment marker.
const isDocumented = (line, prev) =>
  /\/\/|\/\*|\*/.test(line) || /\/\/|\/\*|\*/.test(prev);

/** Live code never imports src/legacy — catches `from`, bare `import`,
 *  `import()` and `require()` specifiers naming a `legacy` path segment. */
function legacyImport() {
  const pattern =
    /(from\s|import\s|import\(|require\()\s*["']([^"']*\/)?legacy(\/[^"']*)?["']/;
  return {
    check({ lines }, fail) {
      lines.forEach((line, i) => {
        if (pattern.test(line)) {
          fail(i + 1, "legacy-import", "imports from src/legacy (quarantined)");
        }
      });
    },
  };
}

/** Package prefixes banned repo-wide (comments included — a reintroduction
 *  fails fast even when drafted). */
function forbiddenImports(packages, why) {
  const escaped = packages.map((name) =>
    name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  );
  const pattern = new RegExp(`from\\s+["'](${escaped.join("|")})(/|["'])`);
  return {
    check({ lines }, fail) {
      lines.forEach((line, i) => {
        if (pattern.test(line)) {
          fail(i + 1, "forbidden-import", why);
        }
      });
    },
  };
}

/** No raw hex outside the token layer; exception classes are configured
 *  per repo (documented-comment carve-outs, data-value line patterns,
 *  file-level brand-glyph allowances). */
function rawHex({
  scope,
  allowLinePatterns,
  commentedException,
  allowFileSuffixes,
}) {
  return {
    check({ path, lines }, fail) {
      if (!scope(path) || isTestFile(path)) return;
      if (allowFileSuffixes.some((suffix) => path.endsWith(suffix))) return;
      lines.forEach((line, i) => {
        if (isPureComment(line)) return;
        const hexes = line.match(/#[0-9a-fA-F]{3,8}\b/g);
        if (!hexes) return;
        if (allowLinePatterns.some((pattern) => pattern.test(line))) return;
        const documented = isDocumented(line, lines[i - 1] ?? "");
        const allWhite = hexes.every(
          (hex) =>
            hex.toUpperCase() === "#FFFFFF" || hex.toLowerCase() === "#fff",
        );
        const excepted =
          commentedException === "any" ? documented : documented && allWhite;
        if (!excepted) {
          fail(i + 1, "raw-hex", "raw hex without a documenting comment");
        }
      });
    },
  };
}

/** fetch() confined to an allowlist (exact files + path prefixes); every
 *  other live, non-test file must stay off the network. */
function fetchOnlyIn({ files, prefixes }) {
  const pattern = /(^|[^a-zA-Z.])fetch\(/;
  return {
    check({ path, lines }, fail) {
      if (isTestFile(path)) return;
      if (files.includes(path)) return;
      if (prefixes.some((prefix) => path.startsWith(prefix))) return;
      lines.forEach((line, i) => {
        if (pattern.test(line)) {
          fail(
            i + 1,
            "fetch-boundary",
            "fetch() outside the repositories client (MVC)",
          );
        }
      });
    },
  };
}

/** Views never fetch or import repositories/gRPC; controllers never fetch —
 *  the repositories are the only network seam. */
function viewBoundaries({ isView, isController, viewForbiddenImports }) {
  return {
    check({ path, lines }, fail) {
      if (isTestFile(path)) return;
      const view = isView(path);
      const controller = isController(path);
      if (!view && !controller) return;
      lines.forEach((line, i) => {
        if (isPureComment(line)) return;
        if (/\bfetch\s*\(/.test(line)) {
          fail(
            i + 1,
            view ? "view-fetch" : "controller-fetch",
            "fetch() outside the repositories (MVC)",
          );
        }
        if (view) {
          for (const pattern of viewForbiddenImports) {
            if (pattern.test(line)) {
              fail(
                i + 1,
                "view-import",
                "views never import the network layer",
              );
            }
          }
        }
      });
    },
  };
}

/** Recursively list checkable files under src/, skipping node_modules and
 *  the src/legacy quarantine (dead code is not linted; importing it is). */
function walk(dir, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue;
      if (toPosix(relative(SRC, path)) === "legacy") continue;
      walk(path, files);
    } else if (/\.(ts|tsx|mts|js|jsx|css)$/.test(entry.name)) {
      files.push(path);
    }
  }
  return files;
}

const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
const rules = REPO_RULES[pkg.name];
if (!rules) {
  console.error(
    `check:boundaries — no rule list for package "${pkg.name}" ` +
      `(known: ${Object.keys(REPO_RULES).join(", ")})`,
  );
  process.exit(1);
}

const failures = [];
const files = walk(SRC);
for (const file of files) {
  const path = toPosix(relative(ROOT, file));
  const lines = readFileSync(file, "utf8").split("\n");
  for (const rule of rules) {
    rule.check({ path, lines }, (line, name, message) => {
      failures.push(`${path}:${line} [${name}] ${message}`);
    });
  }
}

if (failures.length > 0) {
  console.error(`check:boundaries — ${failures.length} violation(s):\n`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}
console.log(
  `check:boundaries — clean (${files.length} files, ${pkg.name} rules).`,
);
