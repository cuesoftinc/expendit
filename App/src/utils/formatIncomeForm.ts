import { incomeFormProps } from "@/components/income/states";
import { IncomePayload } from "@/API/types";

export function formatIncome( obj: incomeFormProps ): IncomePayload {
  return {
    Source: obj.source,
    Amount: parseInt(obj.amount),
    Description: obj.description,
  };
}

export const incomeRequiredFields = [
  "Source",
  "Amount",
  "Description",
];


