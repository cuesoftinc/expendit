"use client"
import { useGrpcClientMethods } from '@/grpc_methods';
import styles from './styles';
import Input  from './Input';

  
const Form = () => {
  const { client } = useGrpcClientMethods();
  const handleChange = () => {};
  const handleSubmit = () => {};

  return (
    <form className={`${styles.formCont}`} onSubmit={handleSubmit}>
      <p className={styles.subHead}>
        Create your account 
      </p>

      <Input 
      label='Full Name'
      name='firstname'
      type='text'
      placeholder='Firstname Lastname'
      handleChange={handleChange}
      />
      <Input 
      label='Email'
      name='email'
      type='email'
      placeholder='name@email.com'
      handleChange={handleChange}
      />
      <Input 
      label='Password'
      name='Password'
      type='password'
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