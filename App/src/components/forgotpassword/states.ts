"use client"

import { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import { useHomeContext } from '@/context';

export interface forgotPasswordProps {
  email: string;
} 
export const useForgotPasswordCustomState = () => {

  const {
    formError,
    setFormError,
    formSuccess,
    setFormSuccess,
    formLoading,
    setFormLoading,
  } = useHomeContext();


  const handleNext = () => {
    
  }

  const initialForm: forgotPasswordProps = {
    email: "",
  };

  const [form, setForm] = useState<forgotPasswordProps>(initialForm);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setForm((prev) => ({ ...prev, [name]: value }))
  };
  
  const handleSubmit = async (e: FormEvent<HTMLButtonElement>) => {
    e.preventDefault();

    if (formLoading) return;
    setFormLoading(true);

    let reg = /^[a-z0-9]+(\.[_a-z0-9]+)*@[a-z0-9-]+(\.[a-z0-9-]+)*(\.[a-z]{2,15})$/;
    const isValidEmail = reg.test(form.email);

    if (!isValidEmail) {
      setFormError("Invalid Email!");
      setFormLoading(false);
      return;
    };

    setForm(initialForm);
  };

  return {
    form,
    formError,
    formSuccess,
    formLoading,
    handleChange,
    handleSubmit,
    handleNext,
  }
}