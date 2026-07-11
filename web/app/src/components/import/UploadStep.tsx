"use client";

import React, { DragEvent, RefObject } from "react";
import { MdOutlineUploadFile } from "react-icons/md";
import LoaderSpinner from "@/components/helpers/LoaderSpinner";
import { styles } from "./styles";
import { CURRENCIES, Currency } from "./types";

interface Props {
  isDragging: boolean;
  isLoading: boolean;
  error: string | null;
  currency: Currency;
  setCurrency: (c: Currency) => void;
  fileInputRef: RefObject<HTMLInputElement>;
  onDragOver: (e: DragEvent<HTMLDivElement>) => void;
  onDragLeave: () => void;
  onDrop: (e: DragEvent<HTMLDivElement>) => void;
  onFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const UploadStep: React.FC<Props> = ({
  isDragging,
  isLoading,
  error,
  currency,
  setCurrency,
  fileInputRef,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileInput,
}) => {
  return (
    <div className="max-w-xl mx-auto mt-6">
      <h2 className="text-xl font-semibold text-slate-800 mb-1">
        Import Bank Statement
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        Upload a CSV, PDF, or image of your bank statement. Transactions are
        extracted, categorized, and checked for duplicates automatically.
      </p>

      <div
        className={styles.dropZone(isDragging)}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !isLoading && fileInputRef.current?.click()}
      >
        {isLoading ? (
          <div className="flex flex-col items-center gap-3">
            <LoaderSpinner style="spin" variant="spin-small" />
            <p className="text-sm text-gray-500">Processing your file…</p>
          </div>
        ) : (
          <>
            <MdOutlineUploadFile className={styles.uploadIcon} />
            <p className={styles.uploadTitle}>
              Drag & drop your file here
            </p>
            <p className={styles.uploadSub}>
              or click to browse from your computer
            </p>
            <span className={styles.uploadBtn}>Choose file</span>
            <p className={styles.uploadHint}>
              Supports CSV, PDF, JPG, PNG, WEBP · Max 10 MB
            </p>
          </>
        )}
      </div>

      {error && <p className={styles.errorText}>{error}</p>}

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.pdf,.txt,.jpg,.jpeg,.png,.webp,.heic,.heif,text/csv,text/plain,application/pdf,image/*"
        className="hidden"
        onChange={onFileInput}
      />

      {/* Currency selector */}
      <div className="mt-5 bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
        <p className="text-sm font-semibold text-slate-700 mb-3">
          Statement currency
        </p>
        <select
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-grayTheme outline-none focus:border-purpleTheme"
          value={currency.code}
          onChange={(e) => {
            const found = CURRENCIES.find((c) => c.code === e.target.value);
            if (found) setCurrency(found);
          }}
        >
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
        <p className="text-sm font-semibold text-slate-700 mb-3">
          What gets imported?
        </p>
        <ul className="space-y-2 text-sm text-gray-600">
          {[
            "Purchases and card payments",
            "Bank transfers and ATM withdrawals",
            "Utility payments",
            "Salary and income credits",
          ].map((item) => (
            <li key={item} className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purpleTheme flex-shrink-0" />
              {item}
            </li>
          ))}
        </ul>
        <p className="text-xs text-gray-400 mt-4">
          Duplicates are automatically detected. You can review and adjust
          categories before confirming the import.
        </p>
      </div>
    </div>
  );
};

export default UploadStep;
