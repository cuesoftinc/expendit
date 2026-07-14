"use client";

import { useState, useRef, useCallback, useEffect, DragEvent } from "react";
import {
  uploadImportApi,
  confirmImportApi,
  discardImportApi,
  updateTransactionCategoryApi,
  getCategoriesApi,
} from "@/api/apis/import-api";
import type {
  ImportResult,
  ImportedTransaction,
  ImportStep,
  Category,
  Currency,
} from "./types";
import { CURRENCIES } from "./types";

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

export const useImportState = () => {
  const [step, setStep] = useState<ImportStep>("upload");
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [transactions, setTransactions] = useState<ImportedTransaction[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [currency, setCurrency] = useState<Currency>(CURRENCIES[0]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getCategoriesApi()
      .then((cats: Category[]) => setCategories(cats.map((c) => c.name)))
      .catch(() => {});
  }, []);

  const processFile = async (file: File) => {
    if (file.size > MAX_FILE_BYTES) {
      setError("File is too large. Maximum size is 10 MB.");
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      const data = await uploadImportApi(file);
      setResult(data);
      setTransactions(data.transactions ?? []);
      setStep("review");
    } catch (e: any) {
      setError(
        e?.response?.data?.error ?? e?.message ?? "Upload failed. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    // reset so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, []);

  const handleCategoryChange = async (txnId: string, category: string) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === txnId ? { ...t, category } : t))
    );
    try {
      await updateTransactionCategoryApi(txnId, category);
    } catch {
      // revert on failure
      setTransactions((prev) =>
        prev.map((t) =>
          t.id === txnId
            ? { ...t, category: transactions.find((x) => x.id === txnId)?.category ?? t.category }
            : t
        )
      );
    }
  };

  const handleConfirm = async () => {
    if (!result) return;
    setIsLoading(true);
    setError(null);
    try {
      await confirmImportApi(result.job.id);
      setStep("done");
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e?.message ?? "Failed to confirm import.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDiscard = async () => {
    if (!result) return;
    setIsLoading(true);
    setError(null);
    try {
      await discardImportApi(result.job.id);
      setResult(null);
      setTransactions([]);
      setStep("upload");
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e?.message ?? "Failed to discard import.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartOver = () => {
    setResult(null);
    setTransactions([]);
    setError(null);
    setStep("upload");
  };

  return {
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
  };
};
