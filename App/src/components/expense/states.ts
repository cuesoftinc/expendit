import { ChangeEvent, useState, FormEvent, useEffect, useRef } from "react";
import { formatNumberWithCommas as formatValue } from "@/utils/formatWithCommas";
import { formatExpense } from "@/utils/formatExpenseForm";
import { expenseCreateApi } from "@/API/APIS/expenseApi";
import { useHomeContext } from "@/context";
import { getExpenseApi } from "@/API/APIS/expenseApi";


export interface expenseFormProps {
  amount: string;
  category: string;
  note: string;
};

export const useExpenseCustomState = () => {

  const {
    setFormError,
    setFormSuccess,
    formLoading,
    setFormLoading,
    setExpenseData,
    categories
  } = useHomeContext();

  const fileInput = useRef<any>(null);
  const [selectedFiles, setSelectedFiles] = useState(null);
  const [category, setCategory] = useState('');

  const initialForm: expenseFormProps = {
    amount: "",
    category: "",
    note: ""
  };
  const [form, setForm] = useState<expenseFormProps>(initialForm);

  const handleChange = (e: any) => {
    const { name, value } = e.target;

    if (name === "amount") {
      const numericValue = value.replace(/[^0-9]/g, '');
      // const formatedNumber = formatNumberWithCommas(numericValue);
      setForm((prev) => ({ ...prev, [name]: numericValue }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }))
    }
  };

  const handleCategory = (e: ChangeEvent<HTMLSelectElement>) => {
    setCategory(e.target.value);
    setForm((prev) => ({ ...prev, category: e.target.value }));
  };

  const handleFileUpload = (e: any) => {
    setSelectedFiles(e.target.files)
  };

  const handleSubmit = async (e: FormEvent<HTMLButtonElement>) => {
    e.preventDefault();

    const completeForm = formatExpense(form);

    await expenseCreateApi({
      completeForm,
      setFormError,
      setFormSuccess,
      setFormLoading,
      setExpenseData
    });

    setForm(initialForm);
  }

  return {
    form,
    formLoading,
    fileInput,
    selectedFiles,
    formatValue,
    category,
    categories,
    setSelectedFiles,
    handleFileUpload,
    handleCategory,
    handleChange,
    handleSubmit
  }
}