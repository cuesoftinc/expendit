import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ImportsView } from "./ImportsView";

const upload = vi.fn();
let activeOrgId: string | undefined = "org-1";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/controllers", () => ({
  useOrg: () => ({ activeOrgId }),
  useImportsController: () => ({
    jobs: [],
    activeJob: null,
    loading: false,
    error: null,
    upload,
  }),
}));

describe("ImportsView empty state", () => {
  beforeEach(() => {
    upload.mockReset();
    activeOrgId = "org-1";
  });

  it("opens the file picker when 'Upload statement' is clicked", () => {
    render(<ImportsView />);
    const input = screen.getByLabelText("Upload files") as HTMLInputElement;
    const click = vi.spyOn(input, "click");

    fireEvent.click(screen.getByRole("button", { name: "Upload statement" }));

    expect(click).toHaveBeenCalledTimes(1);
  });

  it("tells the user why nothing was uploaded when no organization is selected", () => {
    activeOrgId = undefined;
    render(<ImportsView />);
    const input = screen.getByLabelText("Upload files") as HTMLInputElement;
    const file = new File(["a,b"], "june.csv", { type: "text/csv" });

    fireEvent.change(input, { target: { files: [file] } });

    expect(upload).not.toHaveBeenCalled();
    expect(
      screen.getByText("Select an organization before uploading a statement."),
    ).toBeTruthy();
  });
});