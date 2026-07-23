/**
 * Mock: signed-URL artifact download (api.md §2 — the X-5 bucket stands
 * in as a mock-served file) so the MI-14 download journey works
 * end-to-end against the mock server.
 */

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  const { id } = await context.params;
  const body = [
    "Expendit report artifact (mock)",
    `artifact: ${id}`,
    "",
    "period,income,expense,net",
    "2026-06,11350000,9930000,1420000",
    "2026-07,8435200,3614800,4820400",
  ].join("\n");
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="expendit-${id}.csv"`,
    },
  });
}
