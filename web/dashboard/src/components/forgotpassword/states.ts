"use client"

import { useState, ChangeEvent } from 'react';
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
    emailSuccess,
    setEmailSuccess,
    formLoading,
    setFormLoading,
  } = useHomeContext()

  const searchParams = useSearchParams();
  const router = useRouter();
  const resetToken = searchParams.get("resetToken");

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
    if (formLoading) return;
    setFormLoading(true);

    await postEmailApi({
      email: form.email,
      setFormSuccess,
      setFormError,
      setEmailSuccess,
      setFormLoading
    });

    setForm(initialEmailForm);
  };

  const handlePasswordSubmit = async () => {
    if (formLoading) return;
    setFormLoading(true);

    if (resetToken) {
      if (passwordForm.new_password !== passwordForm.con_password) {
        setFormError("passwords does not match");
        return;
      }

      await postNewPasswordApi({
        resetToken,
        passwordForm,
        setFormLoading,
        setFormSuccess,
        setFormError,
      });

      setPasswordForm(initialPasswordForm);
      router.push('/signin');
    } else {
      setFormError('no token provided');
    }
  };

  return {
    form,
    passwordForm,
    formError,
    formSuccess,
    formLoading,
    emailSuccess,
    setEmailSuccess,
    handleChange,
    handlePasswordChange,
    handleEmailSubmit,
    handlePasswordSubmit
  }
}