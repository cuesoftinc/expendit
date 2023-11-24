"use client"
import { useState, ChangeEvent, FormEvent } from 'react';
import { useGrpcClientMethods } from '@/grpc_methods';
import styles from './styles';
import Input  from './Input';
import { signUpForm } from './types';
import { signUpApi } from '@/API/APIS/authApi';
  
const Form = () => {
  const { client } = useGrpcClientMethods();

  const initialForm: signUpForm = {
    firstName: "",
    lastName: "",
    email: "",
    password: ""
  };

  const [ form, setForm ] = useState<signUpForm>(initialForm);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if(name === "firstName" || name === "lastName"){
      const pattern = /^([a-zA-Z]*)$/;
      if(pattern.test(value)){
        setForm((prev) => ({...prev, [name]: value}))
        console.log(form)
      } else{
        return;
      }
    } else{
      setForm((prev) => ({...prev, [name]: value}))
      console.log(form)
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    await signUpApi({ form, })
  };

  return (
    <form className={`${styles.formCont}`} onSubmit={handleSubmit}>
      <p className={styles.subHead}>
        Create your account 
      </p>

      <Input 
        label='First Name'
        name='firstName'
        type='text'
        value={form.firstName}
        placeholder='Firstname'
        handleChange={handleChange}
      />
      <Input 
        label='Last Name'
        name='lastName'
        type='text'
        value={form.lastName}
        placeholder='Lastname'
        handleChange={handleChange}
      />
      <Input 
        label='Email'
        name='email'
        type='email'
        value={form.email}
        placeholder='name@email.com'
        handleChange={handleChange}
      />
      <Input 
        label='Password'
        name='password'
        type='password'
        value={form.password}
        placeholder='*******'
        handleChange={handleChange}
      />

      <div className='w-full'>
        <div className={`${styles.check} mt-8`}>
          <input type="checkbox" className={styles.checkbox} />
          <p>
          By signing up, I agree to Expendit’s &nbsp;
          <span className={styles.links}>terms & conditions</span>
          </p>
        </div>
      </div>

      <div className='w-full mt-6'>
        <button type='submit' className={styles.btn}>
          Sign up
        </button>
      </div>
      <div className='mt-3 text-sm'>
        Already have an Account?
        &nbsp;
        <span className={styles.links}
          onClick={() => {}}>
          Log in
        </span>
      </div>
    </form>
  )
}

export default Form