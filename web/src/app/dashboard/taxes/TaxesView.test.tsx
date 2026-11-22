import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { taxRepo } from "@/models/repositories";
import TaxesView from "./TaxesView";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/controllers", async () => ({
  ...(await import("@/controllers/use-tax")),
  useOrg: () => ({ activeOrgId: "org-1" }),
}));
vi.mock("@/models/repositories", () => ({
  taxRepo: { profile: vi.fn(), estimates: vi.fn(), filings: vi.fn() },
}));

it("shows estimates when filings fail and retries only filing history", async () => {
  vi.mocked(taxRepo.profile).mockResolvedValue({
    id: "profile-1",
    org_id: "org-1",
    jurisdiction: "NG",
    taxpayer_kind: "individual",
    tin: "1234",
    state_of_residence: "NG-LA",
    rc_number: null,
    nin: null,
    category_treatments: {},
  });
  vi.mocked(taxRepo.estimates).mockResolvedValue({
    items: [
      {
        id: "estimate-1",
        profile_id: "profile-1",
        org_id: "org-1",
        kind: "pit",
        period: "2025",
        amount_due: 100,
        due_date: "2026-03-31",
        computed_fields: [],
        authority: { code: "LIRS", name: "Lagos IRS", payment_channels: [] },
        ruleset_id: "pit-1",
        banners: [],
        computed_at: "2026-01-01",
      },
    ],
  });
  vi.mocked(taxRepo.filings)
    .mockRejectedValueOnce(new Error("Filings unavailable"))
    .mockResolvedValueOnce({ items: [] });

  const user = userEvent.setup();
  render(<TaxesView />);

  const estimates = within(
    screen.getByRole("region", { name: "Estimated liabilities" }),
  );
  const history = within(
    screen.getByRole("region", { name: "Filing history" }),
  );
  expect(await estimates.findByText("LIRS")).toBeVisible();

  await user.click(
    await history.findByRole("button", { name: "Retry filing history" }),
  );
  expect(await history.findByText(/No filings yet/)).toBeVisible();
  expect(estimates.getByText("LIRS")).toBeVisible();
  expect(taxRepo.profile).toHaveBeenCalledTimes(1);
  expect(taxRepo.estimates).toHaveBeenCalledTimes(1);
  expect(taxRepo.filings).toHaveBeenCalledTimes(2);
});
