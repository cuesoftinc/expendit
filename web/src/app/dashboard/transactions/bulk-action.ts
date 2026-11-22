export interface BulkActionOutcome {
  succeeded: string[];
  failed: string[];
  message: string;
}

export async function executeBulkAction(
  ids: string[],
  action: "re-categorized" | "deleted",
  mutate: (id: string) => Promise<unknown>,
): Promise<BulkActionOutcome> {
  const results = await Promise.allSettled(ids.map(async (id) => mutate(id)));
  const succeeded: string[] = [];
  const failed: string[] = [];
  for (let index = 0; index < ids.length; index++) {
    if (results[index].status === "fulfilled") {
      succeeded.push(ids[index]);
    } else {
      failed.push(ids[index]);
    }
  }
  const count = succeeded.length;
  const message =
    count === ids.length
      ? `${count} transaction${count === 1 ? "" : "s"} ${action}`
      : `${count} of ${ids.length} transactions ${action}. Retry the failed transactions.`;
  return { succeeded, failed, message };
}
