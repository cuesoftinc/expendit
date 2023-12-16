"use client"

import { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useHomeContext } from '@/context';
import { useGrpcClientMethods } from '@/grpc_methods';
import { signUpFormProps } from './types';
import { signUpApi } from '@/API/APIS/authApi';
import { formatSignUp } from '@/utils/formatSignUpForm';
import { signUpRequiredFields } from '@/utils/formatSignUpForm';
import { SignUpPayload } from '@/API/types';


export const useSignUpCustomState = () => {
  const router = useRouter();
  // const { client } = useGrpcClientMethods();
  const { 
    formError, 
    setFormError, 
    formSuccess, 
    setFormSuccess, 
    formLoading, 
    setFormLoading 
  } = useHomeContext();

  const initialForm: signUpFormProps = {
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phoneNumber: ""
  };

  const [ form, setForm ] = useState<signUpFormProps>(initialForm);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if(name === "firstName" || name === "lastName"){
      const pattern = /^([a-zA-Z]*)$/;
      const isSingleText = pattern.test(value);

      if(isSingleText){
        setForm((prev) => ({...prev, [name]: value}))
      } else {
        return;
      }
    } else if (name === "phoneNumber"){
      const numericValue = value.replace(/[^0-9]/g, '');
      setForm((prev) => ({...prev, [name]: numericValue}))
    } else {
      setForm((prev) => ({...prev, [name]: value}))
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if(formLoading) return;
    setFormLoading(true);

    const completeForm = formatSignUp(form);
    const isAnyRequiredFieldEmpty = signUpRequiredFields.some(
      (field) =>!completeForm[field as keyof SignUpPayload],
    );

    if(isAnyRequiredFieldEmpty) {
      setFormError("Please fill out all fields!");
      setFormLoading(false);
      return;
    };

    let reg = /^[a-z0-9]+(\.[_a-z0-9]+)*@[a-z0-9-]+(\.[a-z0-9-]+)*(\.[a-z]{2,15})$/;
    const isValidEmail = reg.test(form.email);

    if(!isValidEmail){
      setFormError("Invalid Email!");
      setFormLoading(false);
      return;
    };

    await signUpApi({ 
      completeForm, 
      setFormError, 
      setFormSuccess, 
      setFormLoading,
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
    handleSubmit,
    setFormLoading,
    setFormError,
    setFormSuccess,
  }
}