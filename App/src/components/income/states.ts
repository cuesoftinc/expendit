import { ChangeEvent, useState, useEffect, FormEvent } from "react";
import { incomeFormProps } from "./types";
import { incomeCreateApi } from "@/API/APIS/incomeApi";
import { formatIncome, incomeRequiredFields } from "@/utils/formatIncomeForm";
import { IncomePayload } from "@/API/types";


export const useIncomeCustomState = () => {

  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  const initialForm: incomeFormProps = {
    source: "",
    amount: "",
    description: ""
  };
  const [ form, setForm ] = useState<incomeFormProps>(initialForm);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setForm((prev) => ({...prev, [name]: value}))
  }

  useEffect(() => {
    const timerId = setTimeout(() => {
      if (formError !== "") {
        setFormLoading(false);
        setFormError("");
      }

      if (formSuccess !== "") {
        setFormLoading(false);
        setFormSuccess("");
      }
    }, 5000);

    return () => {
      clearTimeout(timerId);
    };
  }, [formLoading, formError, formSuccess]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const completeForm = formatIncome(form);
    const isAnyRequiredFieldEmpty = incomeRequiredFields.some(
      (field) =>!completeForm[field as keyof IncomePayload],
    );

    if(isAnyRequiredFieldEmpty) {
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