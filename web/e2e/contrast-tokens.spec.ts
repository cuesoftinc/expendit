// Contrast-token lock (design.md §2 AA text variants) — recomputes the
// 2026-07-21 audit's failing pairs from the SERVED CSS (custom-property
// values off the live document, both themes) and asserts WCAG AA. The
// tinted-chip recipe (`text-X` on `bg-X/10–20`) plus accent/warn as plain
// text must stay ≥4.5:1; a scoped axe pass plus a rendered-chip sweep lock
// the composed result on the audited dashboard surfaces.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const AA = 4.5;

// ---- WCAG 2.x math over sRGB --------------------------------------------
type Rgb = { r: number; g: number; b: number };

function hexToRgb(hex: string): Rgb {
  const h = hex.trim().replace("#", "");
  const v =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  return {
    r: parseInt(v.slice(0, 2), 16),
    g: parseInt(v.slice(2, 4), 16),
    b: parseInt(v.slice(4, 6), 16),
  };
}

function luminance({ r, g, b }: Rgb): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(a: Rgb, b: Rgb): number {
  const [lo, hi] = [luminance(a), luminance(b)].sort((x, y) => x - y);
  return (hi + 0.05) / (lo + 0.05);
}

/** `bg-X/nn` composited over an opaque base (what the browser paints). */
function tint(hue: Rgb, alpha: number, base: Rgb): Rgb {
  const mix = (f: number, g: number) => Math.round(alpha * f + (1 - alpha) * g);
  return {
    r: mix(hue.r, base.r),
    g: mix(hue.g, base.g),
    b: mix(hue.b, base.b),
  };
}

// ---- served-CSS readers ---------------------------------------------------
async function readTokens(
  page: Page,
  theme: "light" | "dark",
  names: string[],
): Promise<Record<string, Rgb>> {
  const raw = await page.evaluate(
    ({ t, ns }: { t: string; ns: string[] }) => {
      document.documentElement.setAttribute("data-theme", t);
      const cs = getComputedStyle(document.documentElement);
      return Object.fromEntries(
        ns.map((n) => [n, cs.getPropertyValue(n).trim()]),
      );
    },
    { t: theme, ns: names },
  );
  const out: Record<string, Rgb> = {};
  for (const [name, value] of Object.entries(raw)) {
    // The dev server may serve minified hex (#fff) — accept both forms.
    expect(value, `${name} is declared in the served CSS (${theme})`).toMatch(
      /^#([0-9a-f]{3}|[0-9a-f]{6})$/i,
    );
    out[name] = hexToRgb(value);
  }
  return out;
}

const TOKENS = [
  "--color-bg",
  "--color-bg-elev",
  "--color-text-2",
  "--color-accent",
  "--color-warn",
  "--color-income",
  "--color-expense",
  "--color-info",
  "--color-accent-text",
  "--color-warn-text",
  "--color-income-text",
  "--color-expense-text",
];

test("§2 token pairs recomputed from served CSS clear WCAG AA in both themes", async ({
  page,
}) => {
  await page.goto("/");
  for (const theme of ["light", "dark"] as const) {
    const t = await readTokens(page, theme, TOKENS);
    const cases: Array<{ name: string; fg: Rgb; bg: Rgb }> = [];
    const surfaces = ["--color-bg", "--color-bg-elev"] as const;

    // Tinted-recipe pairs: the `-text` label on every alpha its hue ships
    // with (Tag /12, AppNav-EditorialCard /10, Avatar /15, TaxCalendarRow
    // /8–/20, StatementView /10), over both surfaces.
    const recipes: Array<[string, string, number[]]> = [
      ["--color-accent-text", "--color-accent", [0.1, 0.12, 0.15]],
      ["--color-warn-text", "--color-warn", [0.08, 0.1, 0.12, 0.15, 0.2]],
      ["--color-income-text", "--color-income", [0.1, 0.12]],
      ["--color-expense-text", "--color-expense", [0.1, 0.12]],
      ["--color-info", "--color-info", [0.12]], // base stays — locked
    ];
    for (const [fg, hue, alphas] of recipes) {
      for (const alpha of alphas) {
        for (const surface of surfaces) {
          cases.push({
            name: `${fg} on ${hue}/${alpha * 100} over ${surface}`,
            fg: t[fg],
            bg: tint(t[hue], alpha, t[surface]),
          });
        }
      }
    }

    // TaxCalendarRow T-1 compound: chip warn/20 over the row's warn/12.
    for (const surface of surfaces) {
      cases.push({
        name: `--color-warn-text on warn/20 over warn/12 over ${surface}`,
        fg: t["--color-warn-text"],
        bg: tint(
          t["--color-warn"],
          0.2,
          tint(t["--color-warn"], 0.12, t[surface]),
        ),
      });
    }

    // Plain text on the page surfaces (links, deadline copy, neutral Tag).
    for (const fg of [
      "--color-accent-text",
      "--color-warn-text",
      "--color-income-text",
      "--color-expense-text",
      "--color-text-2",
    ]) {
      for (const surface of surfaces) {
        cases.push({ name: `${fg} on ${surface}`, fg: t[fg], bg: t[surface] });
      }
    }

    for (const c of cases) {
      const ratio = contrast(c.fg, c.bg);
      expect
        .soft(ratio, `${theme}: ${c.name} ≥ ${AA} (got ${ratio.toFixed(2)})`)
        .toBeGreaterThanOrEqual(AA);
    }
  }
});

// ---- axe: the fixed classes on the audited surfaces ------------------------
const signIn = async (page: Page): Promise<void> => {
  await page.goto("/signin");
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await page.waitForURL("**/dashboard", { timeout: 15_000 });
};

test("axe color-contrast is clean for the -text classes on the audited surfaces (light)", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/dashboard/transactions");
  await expect(page.locator(".text-accent-text").first()).toBeVisible();

  const results = await new AxeBuilder({ page })
    .include(".text-accent-text")
    .include(".text-warn-text")
    .include(".text-income-text")
    .include(".text-expense-text")
    .withRules(["color-contrast"])
    .analyze();
  expect(
    results.violations.map(
      (violation) => `${violation.id} ×${violation.nodes.length}`,
    ),
  ).toEqual([]);
});

// ---- rendered surface: overview delta pills + tags, light theme ------------
test("overview tinted chips render ≥4.5:1 in light theme (served pages)", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/dashboard");
  const chips = page.locator('[data-testid="stat-delta"], [data-tint]');
  await chips.first().waitFor({ state: "visible", timeout: 15_000 });
  const count = await chips.count();
  expect(count, "overview renders tinted chips").toBeGreaterThan(0);

  for (let i = 0; i < count; i++) {
    const chip = chips.nth(i);
    if (!(await chip.isVisible())) continue;
    const result = await chip.evaluate((el) => {
      type C = { r: number; g: number; b: number; a: number };
      const parse = (s: string): C => {
        const m = s.match(/rgba?\(([^)]+)\)/);
        if (!m) return { r: 0, g: 0, b: 0, a: 0 };
        const [r, g, b, a = "1"] = m[1].split(/[,/ ]+/).filter(Boolean);
        return { r: Number(r), g: Number(g), b: Number(b), a: Number(a) };
      };
      const over = (top: C, base: C): C => ({
        r: top.r * top.a + base.r * (1 - top.a),
        g: top.g * top.a + base.g * (1 - top.a),
        b: top.b * top.a + base.b * (1 - top.a),
        a: 1,
      });
      const layers: C[] = [];
      let node: Element | null = el;
      let opaque = false;
      while (node) {
        const bg = parse(getComputedStyle(node).backgroundColor);
        if (bg.a > 0) layers.push(bg);
        if (bg.a >= 1) {
          opaque = true;
          break;
        }
        node = node.parentElement;
      }
      if (!opaque)
        layers.push(parse(getComputedStyle(document.body).backgroundColor));
      let backdrop = layers[layers.length - 1];
      for (let j = layers.length - 2; j >= 0; j--) {
        backdrop = over(layers[j], backdrop);
      }
      const fg = parse(getComputedStyle(el).color);
      if (fg.a < 1) return null;
      const lum = (c: C) => {
        const lin = (v: number) => {
          const s = v / 255;
          return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
        };
        return 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
      };
      const [lo, hi] = [lum(fg), lum(backdrop)].sort((x, y) => x - y);
      return {
        label: el.textContent?.slice(0, 24) ?? "",
        ratio: (hi + 0.05) / (lo + 0.05),
      };
    });
    if (result === null) continue;
    expect
      .soft(
        result.ratio,
        `chip "${result.label}" renders ≥ ${AA} (got ${result.ratio.toFixed(2)})`,
      )
      .toBeGreaterThanOrEqual(AA);
  }
});
