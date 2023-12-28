"use client"

import { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import { userDetailsProps } from './types';
import { userDetailsApi } from '@/API/APIS/userApi';
import { formatUserDetails, userDetailsRequiredFields } from '@/utils/formatUserDetails';
import { UserDetailsPayload } from '@/API/types';


export const userDetailsCustomState = () => {
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  const initialForm: userDetailsProps = {
    firstName: "",
    lastName: "",
    email: ""
  };

  const [ form, setForm ] = useState<userDetailsProps>(initialForm);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({...prev, [name]: value}))
  };

  const handleCancel = (e: FormEvent<HTMLButtonElement>) => {
    e.preventDefault()

    setForm(initialForm);
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

  const handleSubmit = async (e: FormEvent<HTMLButtonElement>) => {
    e.preventDefault();

    if(formLoading) return;
    setFormLoading(true);

    const completeForm = formatUserDetails(form);
    const isAnyRequiredFieldEmpty = userDetailsRequiredFields.some(
      (field) =>!completeForm[field as keyof UserDetailsPayload],
    );

    if(isAnyRequiredFieldEmpty) {
      setFormError("Please fill out all fields!");
      setFormLoading(false);
      return;
    };


    await userDetailsApi({ 
      completeForm, 
      setFormError, 
      setFormSuccess, 
      setFormLoading,
    });

    setForm(initialForm);
  };


  return {
    form,
    formError,
    formSuccess,
    formLoading,
    handleChange,
    handleSubmit,
    handleCancel,
  }
}