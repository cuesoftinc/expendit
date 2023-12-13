import { expenseFormProps } from "@/components/expense/types";
import { ExpensePayload } from "@/API/types";

export function formatExpense( obj: expenseFormProps ): ExpensePayload {
  return {
    Amount: obj.amount,
    Date: obj.date,
    Category: obj.category,
    Note: obj.note,
    User_type: "USER"
  };
}

export const expenseRequiredFields = [
  "Amount",
  "Date",
  "Category",
  "Note",
];