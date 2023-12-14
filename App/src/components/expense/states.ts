import { ChangeEvent, useState, FormEvent, useEffect, useRef } from "react";
import { formatNumberWithCommas } from "@/utils/formatWithCommas";
import { formatExpense } from "@/utils/formatExpenseForm";
import { expenseCreateApi } from "@/API/APIS/expenseApi";
import { useHomeContext } from "@/context";

export interface expenseFormProps {
  amount: string;
  note: string;
};

export const useExpenseCustomState = () => {

  const {
    setFormError,
    setFormSuccess,
    formLoading,
    setFormLoading
  } = useHomeContext();

  const fileInput = useRef<any>(null);
  const [selectedFiles, setSelectedFiles] = useState(null);
  const [cat, setCat] = useState('');

  const initialForm: expenseFormProps = {
    amount: "",
    note: ""
  };
  const [form, setForm] = useState<expenseFormProps>(initialForm);

  const handleChange = (e: any) => {
    const { name, value } = e.target;

    if (name === "amount") {
      const numericValue = value.replace(/[^0-9]/g, '');
      const formatedNumber = formatNumberWithCommas(numericValue);
      setForm((prev) => ({ ...prev, [name]: formatedNumber }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }))
    }
  };

  const handleCategory = () => { };

  const handleFileUpload = (e: any) => {
    setSelectedFiles(e.target.files)
  };

  // useEffect(() => {
  //   const timerId = setTimeout(() => {
  //     if (formError !== "") {
  //       setFormLoading(false);
  //       setFormError("An error occurred");
  //     }

  //     if (formSuccess !== "") {
  //       setFormLoading(false);
  //       setFormSuccess("Expense successfully added");
  //     }
  //   }, 5000);

  //   return () => {
  //     clearTimeout(timerId);
  //   };
  // }, [formLoading, formError, formSuccess]);

  const handleSubmit = async (e: FormEvent<HTMLButtonElement>) => {
    e.preventDefault();

    const completeForm = formatExpense(form);

    await expenseCreateApi({
      completeForm, 
      setFormError, 
      setFormSuccess, 
      setFormLoading,
    })
  }

  return {
    form,
    formLoading,
    fileInput,
    selectedFiles,
    cat,
    setSelectedFiles,
    handleFileUpload,
    handleCategory,
    handleChange,
    handleSubmit
  }
}