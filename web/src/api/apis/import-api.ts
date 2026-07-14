import { API } from "../axios-setup";
import type {
  ImportResult,
  ImportedTransaction,
  Category,
} from "@/components/import/types";

export const uploadImportApi = async (file: File): Promise<ImportResult> => {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await API.post<ImportResult>("/import/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

export const confirmImportApi = async (jobId: string): Promise<void> => {
  await API.post(`/import/${jobId}/confirm`);
};

export const discardImportApi = async (jobId: string): Promise<void> => {
  await API.delete(`/import/${jobId}`);
};

export const updateTransactionCategoryApi = async (
  txnId: string,
  category: string
): Promise<void> => {
  await API.put(`/import/transaction/${txnId}/category`, { category });
};

export const getCategoriesApi = async (): Promise<Category[]> => {
  const { data } = await API.get<Category[]>("/category");
  return data;
};
