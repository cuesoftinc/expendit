"use client";

import React from "react";
import Link from "next/link";
import { MdCheckCircleOutline } from "react-icons/md";
import { useImportState } from "./states";
import UploadStep from "./UploadStep";
import ReviewStep from "./ReviewStep";
import { styles } from "./styles";

const ImportPage = () => {
  const {
    step,
    isDragging,
    isLoading,
    error,
    result,
    transactions,
    categories,
    currency,
    setCurrency,
    fileInputRef,
    handleFileInput,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleCategoryChange,
    handleConfirm,
    handleDiscard,
    handleStartOver,
  } = useImportState();

  return (
    <div className="md:ml-3 ml-0">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6 text-xs text-gray-400 font-medium">
        <span className={step === "upload" ? "text-purpleTheme font-semibold" : ""}>
          1. Upload
        </span>
        <span>/</span>
        <span className={step === "review" ? "text-purpleTheme font-semibold" : ""}>
          2. Review
        </span>
        <span>/</span>
        <span className={step === "done" ? "text-purpleTheme font-semibold" : ""}>
          3. Done
        </span>
      </div>

      {step === "upload" && (
        <UploadStep
          isDragging={isDragging}
          isLoading={isLoading}
          error={error}
          currency={currency}
          setCurrency={setCurrency}
          fileInputRef={fileInputRef}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onFileInput={handleFileInput}
        />
      )}

      {step === "review" && result && (
        <ReviewStep
          result={result}
          transactions={transactions}
          categories={categories}
          currency={currency}
          isLoading={isLoading}
          error={error}
          onCategoryChange={handleCategoryChange}
          onConfirm={handleConfirm}
          onDiscard={handleDiscard}
        />
      )}

      {step === "done" && result && (
        <div className={styles.doneWrap}>
          <MdCheckCircleOutline className="text-6xl text-green-500 mb-4" />
          <h2 className={styles.doneTitle}>Import successful!</h2>
          <p className={styles.doneSub}>
            {result.job.imported} transaction
            {result.job.imported !== 1 ? "s" : ""} have been saved to your
            account.
          </p>

          {result.job.ai_summary && (
            <div className="mt-4 mb-6 max-w-md bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-4 text-left">
              <p className="text-xs font-semibold text-purple-600 mb-1">AI Summary</p>
              <p className="text-sm text-slate-700 leading-relaxed">{result.job.ai_summary}</p>
            </div>
          )}

          <div className="flex gap-3">
            <Link href="/history" className={styles.doneBtn}>
              View history
            </Link>
            <button
              className={styles.discardBtn}
              onClick={handleStartOver}
            >
              Import another file
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportPage;
