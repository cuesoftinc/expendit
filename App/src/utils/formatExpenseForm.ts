import { expenseFormProps } from "@/components/expense/states";
import { ExpensePayload } from "@/API/types";

export function formatExpense( obj: expenseFormProps ): ExpensePayload {
  return {
    Amount: parseInt(obj.amount),
    Category: obj.category,
    Note: obj.note,
    User_type: "USER"
  };
}

export const expenseRequiredFields = [
  "Amount",
  "Category",
  "Note",
];