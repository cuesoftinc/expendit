import { ChangeEvent, useState, useEffect, FormEvent } from "react";
import { useHomeContext } from "@/context";
import { incomeCreateApi } from "@/api/apis/income-api";
import { formatIncome, incomeRequiredFields } from "@/utils/format-income-form";
import { formatNumberWithCommas as formatValue } from "@/utils/format-with-commas";
import { getIncomeApi } from "@/api/apis/income-api";
import { IncomePayload } from "@/api/types";

export interface incomeFormProps {
  source: string;
  amount: string;
  description: string;
}

export const useIncomeCustomState = () => {
  const {
    formError,
    setFormError,
    formSuccess,
    setFormSuccess,
    formLoading,
    setFormLoading,
    setPresentIncome,
    setBarChart,
  } = useHomeContext();

  const initialForm: incomeFormProps = {
    source: "",
    amount: "",
    description: "",
  };
  const [form, setForm] = useState<incomeFormProps>(initialForm);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === "amount") {
      const numericValue = value.replace(/[^0-9]/g, "");
      setForm((prev) => ({ ...prev, [name]: numericValue }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const completeForm = formatIncome(form);
    const isAnyRequiredFieldEmpty = incomeRequiredFields.some(
      (field) => !completeForm[field as keyof IncomePayload],
    );

    if (isAnyRequiredFieldEmpty) {
      setFormError("Please fill out all fields!");
      setFormLoading(false);
      return;
    }

    await incomeCreateApi({
      completeForm,
      setFormError,
      setFormSuccess,
      setFormLoading,
      setPresentIncome,
      setBarChart,
    });

    setForm(initialForm);
  };

  return {
    form,
    formError,
    formSuccess,
    formLoading,
    formatValue,
    handleChange,
    handleSubmit,
  };
};
