// 'use client'

// import React, { useState } from 'react'
// import Link from 'next/link'
// import { FcGoogle } from 'react-icons/fc'
// import Image from 'next/image'
// import LoginImg from "../../assets/images/expendit-login.png"
// import styles from "./styles"

// const SignIn = () => {
//   const [email, setEmail] = useState("")
//   const [password, setPassword] = useState("")

//   return (
//     <div className={styles.pageContainer}>
//       <div className={styles.imageContainer}>
//         <Image className={styles.image} src={LoginImg} alt=""/>
//       </div>
//       <div className={styles.formContainer}>
//         <form>
//           <h2 className={styles.login}>Login</h2>
//           <div className={styles.inputWrapper}>
//             <label className={styles.label}>Email </label>
//             <input value={email} onChange={(e) => setEmail(e.target.value)} className={styles.input} type="email" placeholder='Enter email address'/>
//           </div>
//           <div className={styles.inputWrapper}>
//             <label className={styles.label}>Password </label>
//             <input value={password} onChange={(e) => setPassword(e.target.value)} className={styles.input} type= "password" placeholder='Enter password'/>
//           </div>
//           <div className={styles.checkboxWrapper}>
//             <p className={styles.checkbox}><input className='mr-2' type='checkbox'/>Remember me</p>
//             <p className={styles.link}>Forgot password?</p>
//           </div>
//           <div className={styles.submitWrapper}>
//             <input className={styles.submit} type="submit" value="Sign In"/>
//           </div>
//           <div className={styles.buttonWrapper}>
//             <button className={styles.button}>
//               <span className={styles.googleButton}> <FcGoogle/> Login with Google</span>
//             </button>
//           </div>
//           <p className={styles.signUp}>New to Expendit? <Link href="/signup" className={styles.link}>Create an account</Link></p>
//         </form>
//       </div>
//     </div>
//   )
// }

// export default SignIn
import React, { Fragment } from 'react';
import Page from '@/components/signin/Index';

export const metadata = {
  title: 'Expendit | Sign-in',
  description: 'Expendit Sign-in page',
};

const SignIn = () => {
  return (
    <Fragment>
      <Page />
    </Fragment>
  )
}

export default SignIn
