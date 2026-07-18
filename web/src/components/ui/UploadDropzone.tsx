"use client";

/**
 * UploadDropzone — design.md §3/§8.2 (MI-2): idle / drag-over / per-file
 * progress ring / AI-sweep / complete / error. Border animates to accent
 * on drag-over; per-file ring morphs to an indeterminate AI-sparkle sweep
 * on parse start; complete pops a ✓ + row count.
 */

import React, { useRef, useState } from "react";
import {
  Check,
  CircleAlert,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Sparkles,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/cn";

export type UploadFileState =
  | { phase: "progress"; percent: number }
  | { phase: "ai-sweep" }
  | { phase: "complete"; rowCount: number }
  | { phase: "error"; message: string };

export interface UploadFileItem {
  id: string;
  name: string;
  fileType: "csv" | "pdf" | "image";
  state: UploadFileState;
}

export interface UploadDropzoneProps {
  files?: UploadFileItem[];
  onFiles?: (files: File[]) => void;
  accept?: string;
  disabled?: boolean;
  className?: string;
}

const FILE_ICON = {
  csv: FileSpreadsheet,
  pdf: FileText,
  image: ImageIcon,
} as const;

const RING_RADIUS = 8;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const ProgressRing: React.FC<{ percent: number }> = ({ percent }) => (
  <svg
    data-testid="upload-progress-ring"
    viewBox="0 0 20 20"
    className="h-5 w-5 -rotate-90"
    role="progressbar"
    aria-valuemin={0}
    aria-valuemax={100}
    aria-valuenow={Math.round(percent)}
  >
    <circle
      cx="10"
      cy="10"
      r={RING_RADIUS}
      fill="none"
      strokeWidth="2"
      className="stroke-border"
    />
    <circle
      cx="10"
      cy="10"
      r={RING_RADIUS}
      fill="none"
      strokeWidth="2"
      strokeLinecap="round"
      strokeDasharray={RING_CIRCUMFERENCE}
      strokeDashoffset={RING_CIRCUMFERENCE * (1 - percent / 100)}
      className="stroke-accent transition-[stroke-dashoffset] duration-base ease-standard"
    />
  </svg>
);

const FileStateIndicator: React.FC<{ state: UploadFileState }> = ({
  state,
}) => {
  switch (state.phase) {
    case "progress":
      return <ProgressRing percent={state.percent} />;
    case "ai-sweep":
      // MI-2: ring morphs to an indeterminate AI-sparkle sweep on parse.
      return (
        <span
          data-testid="upload-ai-sweep"
          className="relative flex h-5 w-5 items-center justify-center"
        >
          <span className="absolute inset-0 animate-spin rounded-full border-2 border-info/30 border-t-info motion-reduce:animate-none" />
          <Sparkles aria-hidden className="h-2.5 w-2.5 text-info" />
        </span>
      );
    case "complete":
      return (
        <span
          data-testid="upload-complete"
          className="flex h-5 w-5 items-center justify-center rounded-full bg-income text-on-accent animate-stamp-in motion-reduce:animate-none"
        >
          <Check aria-hidden strokeWidth={3} className="h-3 w-3" />
        </span>
      );
    case "error":
      return <CircleAlert aria-hidden className="h-5 w-5 text-expense" />;
  }
};

export const UploadDropzone: React.FC<UploadDropzoneProps> = ({
  files = [],
  onFiles,
  accept,
  disabled = false,
  className,
}) => {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    onFiles?.(Array.from(list));
  };

  return (
    <div className={cn("w-full", className)}>
      <div
        data-testid="dropzone"
        data-state={dragOver ? "drag-over" : "idle"}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          if (!disabled) handleFiles(event.dataTransfer.files);
        }}
        className={cn(
          "flex flex-col items-center gap-2 rounded border-2 border-dashed px-6 py-8 text-center",
          "transition-colors duration-base ease-standard",
          dragOver ? "border-accent bg-accent/5" : "border-border",
          disabled && "opacity-60",
        )}
      >
        <Upload aria-hidden className="h-5 w-5 text-text-2" />
        <p className="text-sm text-text">
          Drag a statement here, or{" "}
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className="font-medium text-accent underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            browse
          </button>
        </p>
        <p className="flex items-center gap-2 text-[11px] text-text-2">
          <FileSpreadsheet aria-hidden className="h-3.5 w-3.5" /> CSV
          <FileText aria-hidden className="h-3.5 w-3.5" /> PDF
          <ImageIcon aria-hidden className="h-3.5 w-3.5" /> Receipt image
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={accept}
          disabled={disabled}
          aria-label="Upload files"
          onChange={(event) => {
            handleFiles(event.target.files);
            event.target.value = "";
          }}
          className="hidden"
        />
      </div>

      {files.length > 0 ? (
        <ul className="mt-3 space-y-1.5">
          {files.map((file) => {
            const Icon = FILE_ICON[file.fileType];
            return (
              <li
                key={file.id}
                data-phase={file.state.phase}
                className="flex items-center gap-2.5 rounded border border-border bg-bg-elev px-3 py-2 text-[13px] text-text"
              >
                <Icon aria-hidden className="h-4 w-4 shrink-0 text-text-2" />
                <span className="min-w-0 flex-1 truncate">{file.name}</span>
                {file.state.phase === "complete" ? (
                  <span className="tabular-nums text-text-2">
                    {file.state.rowCount} transactions found
                  </span>
                ) : null}
                {file.state.phase === "error" ? (
                  <span role="alert" className="text-expense">
                    {file.state.message}
                  </span>
                ) : null}
                <FileStateIndicator state={file.state} />
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
};

export default UploadDropzone;
