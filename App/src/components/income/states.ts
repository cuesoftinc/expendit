import { ChangeEvent, useState, useEffect, FormEvent } from "react";
import { useHomeContext } from "@/context";
import { incomeCreateApi } from "@/API/APIS/incomeApi";
import { formatIncome, incomeRequiredFields } from "@/utils/formatIncomeForm";
import { formatNumberWithCommas } from "@/utils/formatWithCommas";
import { IncomePayload } from "@/API/types";

export interface incomeFormProps {
  source: string;
  amount: string;
  description: string;
};

export const useIncomeCustomState = () => {
  const {
    formError,
    setFormError,
    formSuccess,
    setFormSuccess,
    formLoading,
    setFormLoading
  } = useHomeContext();

  const initialForm: incomeFormProps = {
    source: "",
    amount: "",
    description: ""
  };
  const [form, setForm] = useState<incomeFormProps>(initialForm);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === "amount") {
      const numericValue = value.replace(/[^0-9]/g, '');
      const formatedNumber = formatNumberWithCommas(numericValue);
      setForm((prev) => ({ ...prev, [name]: formatedNumber }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }))
    }
  }

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
    };

    await incomeCreateApi({
      completeForm,
      setFormError,
      setFormSuccess,
      setFormLoading,
    });

    setForm(initialForm);
  }

  return {
    form,
    formError,
    formSuccess,
    formLoading,
    handleChange,
    handleSubmit
  }
}