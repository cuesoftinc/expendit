import { ChangeEvent, useState, useEffect, FormEvent } from "react";
import { expenseFormProps } from "./types";
import { expenseCreateApi } from "@/API/APIS/expenseApi";
import { expenseRequiredFields, formatExpense } from "@/utils/formatExpenseForm";
import { ExpensePayload } from "@/API/types";


export const useExpenseCustomState = () => {

  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  const initialForm: expenseFormProps = {
    amount: "",
    date: "",
    category: "",
    note: ""
  };
  const [ form, setForm ] = useState<expenseFormProps>(initialForm);

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

    const completeForm = formatExpense(form);
    const isAnyRequiredFieldEmpty = expenseRequiredFields.some(
      (field) =>!completeForm[field as keyof ExpensePayload],
    );

    if(isAnyRequiredFieldEmpty) {
      setFormError("Please fill out all fields!");
      setFormLoading(false);
      return;
    };

    await expenseCreateApi({ 
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