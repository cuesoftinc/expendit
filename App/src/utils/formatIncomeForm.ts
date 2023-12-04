import { incomeFormProps } from "@/components/income/types";
import { IncomePayload } from "@/API/types";

export function formatIncome( obj: incomeFormProps ): IncomePayload {
  return {
    Source: obj.source,
    Amount: obj.amount,
    Date: obj.date,
    User_type: "USER"
  };
}

export const incomeRequiredFields = [
  "Source",
  "Amount",
  "Date",
];


