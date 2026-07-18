"use client";

/**
 * GitHub stars controller — the A8 badge count is populated at runtime,
 * never baked into designs or copy (pages.md A8; the A1 nav badge stays
 * neutral "Star" — design.md §8.2b as-built). Falls back to the neutral
 * label when the fetch fails or in TEST_MODE (Playwright must not hit
 * the network).
 */

import { useEffect, useState } from "react";
import { isTestMode } from "@/config/env";

export const GITHUB_REPO = "cuesoftinc/expendit";

/** Module cache — one fetch per session. */
let cachedStars: number | null | undefined;

export const formatStars = (stars: number): string =>
  stars >= 1000
    ? `${(stars / 1000).toFixed(1).replace(/\.0$/, "")}k`
    : `${stars}`;

export interface GithubStarsController {
  /** null = unknown → callers render the neutral "Star on GitHub". */
  stars: number | null;
}

export const useGithubStarsController = (
  repo: string = GITHUB_REPO,
): GithubStarsController => {
  const [stars, setStars] = useState<number | null>(
    typeof cachedStars === "number" ? cachedStars : null,
  );

  useEffect(() => {
    if (
      isTestMode() ||
      cachedStars !== undefined ||
      typeof fetch !== "function"
    )
      return;
    let cancelled = false;
    fetch(`https://api.github.com/repos/${repo}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { stargazers_count?: unknown } | null) => {
        const count =
          typeof data?.stargazers_count === "number"
            ? data.stargazers_count
            : null;
        cachedStars = count;
        if (!cancelled && count !== null) setStars(count);
      })
      .catch(() => {
        // Neutral fallback — the badge stays "Star on GitHub".
        cachedStars = null;
      });
    return () => {
      cancelled = true;
    };
  }, [repo]);

  return { stars };
};
