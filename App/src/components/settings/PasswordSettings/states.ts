"use client"

import { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import { passwordChangeProps } from './types';
import { passwordChangeApi } from '@/API/APIS/authApi';
import { formatPasswordChange, passwordRequiredFields } from '@/utils/formatPasswordChange';
import { PasswordPayload } from '@/API/types';


export const usePasswordCustomState = () => {
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  const initialForm: passwordChangeProps = {
    old_password: "",
    new_password: "",
    confirm_password: ""
  };

  const [ form, setForm ] = useState<passwordChangeProps>(initialForm);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({...prev, [name]: value}))
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
    e.preventDefault();

    if(formLoading) return;
    setFormLoading(true);

    const completeForm = formatPasswordChange(form);
    const isAnyRequiredFieldEmpty = passwordRequiredFields.some(
      (field) =>!completeForm[field as keyof PasswordPayload],
    );

    if(isAnyRequiredFieldEmpty) {
      setFormError("Please fill out all fields!");
      setFormLoading(false);
      return;
    };

    if (form.new_password === form.old_password) {
      setFormError("New password should not be the same as the old password!");
      setFormLoading(false);
      return;
    }

    if (form.new_password !== form.confirm_password) {
      setFormError("New password and confirm password do not match!");
      setFormLoading(false);
      return;
    }

    await passwordChangeApi({ 
      completeForm, 
      setFormError, 
      setFormSuccess, 
      setFormLoading,
    });

    setForm(initialForm);
  };

  const isSubmitDisabled = form.new_password !== form.confirm_password || formLoading;

  return {
    form,
    formError,
    formSuccess,
    formLoading,
    handleChange,
    handleSubmit,
    isSubmitDisabled
  }
}