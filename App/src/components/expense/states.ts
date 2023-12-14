import { ChangeEvent, useState, FormEvent, useRef } from "react";
import { formatNumberWithCommas } from "@/utils/formatWithCommas";
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

  const handleSubmit = async (e: FormEvent<HTMLButtonElement>) => {

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