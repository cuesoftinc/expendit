"use client"

import { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useHomeContext } from '@/context';
import { signInFormProps } from './types';
import { signInApi } from '@/API/APIS/authApi';
import { formatSignIn } from '@/utils/formatSignInForm';
import { signInRequiredFields } from '@/utils/formatSignInForm';
import { SignInPayload } from '@/API/types';


export const useSignInCustomState = () => {
  const router = useRouter();
  // const { client } = useGrpcClientMethods();
  const {
    formError,
    setFormError,
    formSuccess,
    setFormSuccess,
    formLoading,
    setFormLoading,
    setUser
  } = useHomeContext();

  const initialForm: signInFormProps = {
    email: "",
    password: ""
  };

  const [form, setForm] = useState<signInFormProps>(initialForm);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === "firstName" || name === "lastName") {
      const pattern = /^([a-zA-Z]*)$/;
      const isSingleText = pattern.test(value);

      if (isSingleText) {
        setForm((prev) => ({ ...prev, [name]: value }))
      } else {
        return;
      }
    } else if (name === "phoneNumber") {
      const numericValue = value.replace(/[^0-9]/g, '');
      setForm((prev) => ({ ...prev, [name]: numericValue }))
    } else {
      setForm((prev) => ({ ...prev, [name]: value }))
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (formLoading) return;
    setFormLoading(true);

    const completeForm = formatSignIn(form);
    const isAnyRequiredFieldEmpty = signInRequiredFields.some(
      (field) => !completeForm[field as keyof SignInPayload],
    );

    if (isAnyRequiredFieldEmpty) {
      setFormError("Please fill out all fields!");
      setFormLoading(false);
      return;
    };

    let reg = /^[a-z0-9]+(\.[_a-z0-9]+)*@[a-z0-9-]+(\.[a-z0-9-]+)*(\.[a-z]{2,15})$/;
    const isValidEmail = reg.test(form.email);

    if (!isValidEmail) {
      setFormError("Invalid Email!");
      setFormLoading(false);
      return;
    };

    await signInApi({
      completeForm,
      setFormError,
      setFormSuccess,
      setFormLoading,
      setUser,
      router
    });

    setForm(initialForm);
  };

  return {
    form,
    formError,
    formSuccess,
    formLoading,
    handleChange,
    handleSubmit
  }
}