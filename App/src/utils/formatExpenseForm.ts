import { expenseFormProps } from "@/components/expense/states";
import { ExpensePayload } from "@/API/types";

export function formatExpense(obj: expenseFormProps, category: string): ExpensePayload {
  return {
    Amount: parseInt(obj.amount),
    Category: category,
    Note: obj.note,
  };
}

export const expenseRequiredFields = [
  "amount",
  "note",
];