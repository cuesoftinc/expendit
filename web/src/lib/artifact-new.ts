/**
 * MI-14 NEW rule — an artifact is NEW while it is at most 24h old.
 *
 * Implemented as "created on or after now − 24h" (future-dated counts as
 * new): the previous |diff| ≤ 24h comparison quietly dropped the tag for
 * artifacts stamped by the TEST_MODE mock clock (pinned at 2026-07-20)
 * once the real clock drifted past the absorb window — a freshly
 * generated report rendered without its NEW tag (system QA 2026-07-19).
 */
export const isArtifactNew = (
  createdAt: string,
  now: Date = new Date(),
): boolean => {
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return false;
  return created >= now.getTime() - 24 * 60 * 60 * 1000;
};
