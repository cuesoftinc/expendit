import React, { Fragment }  from 'react';
import Avatar from '@/assets/images/avatar.jpg';
import Image from 'next/image';
import styles from './styles';
import Input from '@/components/signup/Input';
import { userDetailsCustomState } from './states';
import LoaderSpinner from '@/components/helpers/LoaderSpinner';
import Notification from '@/components/helpers/Notification';

const index = () => {
  const {
    form,
    formError,
    formSuccess,
    formLoading,
    handleChange,
    handleSubmit,
    handleCancel,
  } = userDetailsCustomState()
  return (
    <div className={styles.pagePad}>
      <section>
        <div className={styles.introContainer}>
          <div>
            <h1 className={styles.semibold}>Personal Info</h1>
            <p className={styles.introParagraph}>Update your photo and personal details here</p>
          </div>
          <div className={styles.controlContainer}>
            <button className={styles.button} onClick={handleCancel}>Cancel</button>
            <button 
            className={styles.changeButton}  
            onClick={handleSubmit}>
            { formLoading 
              ? <LoaderSpinner 
                style='spin' 
                variant='spin-small' 
              /> 
              :  "Save Changes" 
            }
            </button>
          </div>
        </div>
        <Fragment>
          {formError !== "" && <Notification msg={formError} type="error" />}
          {formSuccess !== "" && <Notification msg={formSuccess} type="success" />}
          <form>
            <div className={styles.section}>
              <div>
                <p className={styles.Name}>Name</p>
              </div>
              <div className={styles.inputContainer}>
                <Input
                  name= 'first_name'
                  type= 'text'
                  label= ''
                  value= {form.first_name}
                  placeholder='Enter First Name'
                  handleChange={handleChange}
                  custom
                />
                <Input
                  name= 'last_name'
                  type= 'text'
                  label= ''
                  value= {form.last_name}
                  placeholder='Enter Last Name'
                  handleChange={handleChange}
                  custom
                />
              </div>
            </div>
            <div className={styles.emailContainer}>
              <div>
                <p className={styles.semibold}>Email</p>
              </div>
              <div className={styles.emailInputContainer}>
                <Input
                  name= 'email'
                  type= 'email'
                  label= ''
                  value= {form.email}
                  placeholder='Enter Email'
                  handleChange={handleChange}
                  custom
                />
              </div>
            </div>
            <div className={styles.section}>
              <div className={styles.selfcenter}>
                <h1 className={styles.semibold}>Your Avatar</h1>
                <p className={styles.avatar}>This avatar would be displayed on your profile</p>
              </div>
              <div className={styles.imageContainer}>
                <Image
                  className={styles.image}
                  src={Avatar}
                  alt="user-profile"
                />
              </div>
              <div className={styles.imageButtons}>
                <button className={styles.changeButton}>Upload New</button>
                <button className={styles.button}>Delete Avatar</button>
              </div>
            </div>
          </form>
        </Fragment>
      </section>
    </div>
  )
}

export default index
