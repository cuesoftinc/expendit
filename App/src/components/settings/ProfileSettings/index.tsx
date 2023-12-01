import React from 'react'
import Avatar from '@/assets/images/avatar.jpg';
import Image from 'next/image';
import styles from './styles'

const index = () => {
  return (
    <div className={styles.pagePad}>
      <section>
        <div className={styles.introContainer}>
          <div>
            <h1 className={styles.semibold}>Personal Info</h1>
            <p className={styles.introParagraph}>Update your photo and personal details here</p>
          </div>
          <div className={styles.controlContainer}>
            <button className={styles.button}>Cancel</button>
            <button className={styles.changeButton}>Save Changes</button>
          </div>
        </div>
        <div className={styles.section}>
          <div>
            <p className={styles.Name}>Name</p>
          </div>
          <div className={styles.inputContainer}>
            <input className={styles.input} placeholder='first name'/>
            <input className={styles.input} placeholder='last name'/>
          </div>
        </div>
        <div className={styles.emailContainer}>
          <div>
            <p className={styles.email}>Email</p>
          </div>
          <div className={styles.emailInputContainer}>
            <input className={styles.emailInput} placeholder='abdulsamad.raji@cuesoft.io'/>
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
      </section>
    </div>
  )
}

export default index
