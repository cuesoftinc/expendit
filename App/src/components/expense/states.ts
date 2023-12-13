import { ChangeEvent, useState, useEffect, FormEvent, useRef } from "react";
import { expenseFormProps } from "./types";

export const useExpenseCustomState = () => {
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  const fileInput = useRef<any>(null);
  const [ selectedFiles, setSelectedFiles ] = useState(null);

  const initialForm: expenseFormProps = {
    amount: "",
    category: "",
    note: ""
  };
  const [ form, setForm ] = useState<expenseFormProps>(initialForm);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    const numericValue = value.replace(/[^0-9]/g, '');
    setForm((prev) => ({...prev, [name]: numericValue}));
  };

  const handleFileUpload = (e: any) => {
    setSelectedFiles(e.target.files)
  };

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

  const handleSubmit = async (e: FormEvent<HTMLButtonElement>) => {
    
  }

  return {
    form,
    formError,
    formSuccess,
    formLoading,
    fileInput,
    selectedFiles,
    setSelectedFiles,
    handleFileUpload,
    handleChange,
    handleSubmit
  }
}