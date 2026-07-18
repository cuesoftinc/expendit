import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UploadDropzone, { type UploadFileItem } from "./UploadDropzone";

describe("UploadDropzone (design.md §8.2, MI-2)", () => {
  it("drag-over animates the border state to accent", () => {
    render(<UploadDropzone />);
    const zone = screen.getByTestId("dropzone");
    expect(zone).toHaveAttribute("data-state", "idle");
    fireEvent.dragOver(zone);
    expect(zone).toHaveAttribute("data-state", "drag-over");
    expect(zone).toHaveClass("border-accent");
    fireEvent.dragLeave(zone);
    expect(zone).toHaveAttribute("data-state", "idle");
  });

  it("browse input forwards files", async () => {
    const onFiles = vi.fn();
    render(<UploadDropzone onFiles={onFiles} />);
    const file = new File(["a,b"], "statement.csv", { type: "text/csv" });
    await userEvent.upload(screen.getByLabelText("Upload files"), file);
    expect(onFiles).toHaveBeenCalledWith([file]);
  });

  it("per-file progress ring reports percent", () => {
    const files: UploadFileItem[] = [
      {
        id: "f1",
        name: "june.csv",
        fileType: "csv",
        state: { phase: "progress", percent: 40 },
      },
    ];
    render(<UploadDropzone files={files} />);
    expect(screen.getByTestId("upload-progress-ring")).toHaveAttribute(
      "aria-valuenow",
      "40",
    );
  });

  it("AI-sweep phase renders the indeterminate sparkle sweep", () => {
    const files: UploadFileItem[] = [
      { id: "f1", name: "june.pdf", fileType: "pdf", state: { phase: "ai-sweep" } },
    ];
    render(<UploadDropzone files={files} />);
    expect(screen.getByTestId("upload-ai-sweep")).toBeInTheDocument();
  });

  it("complete pops the ✓ and the row count", () => {
    const files: UploadFileItem[] = [
      {
        id: "f1",
        name: "june.csv",
        fileType: "csv",
        state: { phase: "complete", rowCount: 214 },
      },
    ];
    render(<UploadDropzone files={files} />);
    expect(screen.getByTestId("upload-complete")).toBeInTheDocument();
    expect(screen.getByText("214 transactions found")).toBeInTheDocument();
  });

  it("error phase surfaces the message", () => {
    const files: UploadFileItem[] = [
      {
        id: "f1",
        name: "scan.png",
        fileType: "image",
        state: { phase: "error", message: "unreadable_file" },
      },
    ];
    render(<UploadDropzone files={files} />);
    expect(screen.getByRole("alert")).toHaveTextContent("unreadable_file");
  });
});
