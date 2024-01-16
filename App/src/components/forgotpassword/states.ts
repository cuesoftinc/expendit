"use client"

import { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useHomeContext } from '@/context';
import { postEmailApi, postNewPasswordApi } from '@/API/APIS/forgotPasswordApi';
import { PasswordResetProps, forgotPasswordProps } from './types';

export const useForgotPasswordCustomState = () => {
  const {
    formError,
    setFormError,
    formSuccess,
    setFormSuccess,
    formLoading,
    setFormLoading,
  } = useHomeContext()

  const searchParams = useSearchParams();
  const router = useRouter();
  const gottenToken = searchParams.get("resetToken");

  console.log(gottenToken)

  const initialEmailForm: forgotPasswordProps = {
    email: "",
  };

  const initialPasswordForm: PasswordResetProps = {
    new_password: "",
    con_password: ""
  };

  const [form, setForm] = useState<forgotPasswordProps>(initialEmailForm);
  const [passwordForm, setPasswordForm] = useState<PasswordResetProps>(initialPasswordForm);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setForm((prev) => ({ ...prev, [name]: value }))
  };

  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setPasswordForm((prev) => ({ ...prev, [name]: value }))
  };

  const handleEmailSubmit = async () => {
    try {
      await postEmailApi(form.email);
      setFormSuccess("Successful")
    } catch (error) {
      console.log(error)
      setFormError("An error occurred, try again")
    }
  };

  const handlePasswordSubmit = async () => {
    if (formLoading) return;
    setFormLoading(true);
    try {
      if (gottenToken) {
        if (passwordForm.new_password !== passwordForm.con_password) {
          setFormError("passwords does not match");
          return;
        }

        const payload = JSON.stringify({ passwordForm });

        await postNewPasswordApi(gottenToken, payload, setFormLoading);
        setFormLoading(false);
        setPasswordForm(initialPasswordForm);
        router.push('/signin');
      }
    } catch (error) {
      console.log(error)
      setFormLoading(false)
    }
  };

  return {
    form,
    passwordForm,
    formError,
    formSuccess,
    formLoading,
    handleChange,
    handlePasswordChange,
    handleEmailSubmit,
    handlePasswordSubmit
  }
}