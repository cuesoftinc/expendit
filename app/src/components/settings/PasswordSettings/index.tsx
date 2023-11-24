import React from 'react'
import styles from './styles'

const index = () => {
  return (
    <div className={styles.pagePad}>
      <section>
        <div className={styles.section}>
          <div>
            <h1 className={styles.semibold}>Change Password</h1>
            <p className={styles.paragraph}>Update your password here</p>
          </div>
          <div className={styles.buttonContainer}>
            <button className={styles.button}>Cancel</button>
            <button className={styles.changeButton}>Save Changes</button>
          </div>
        </div>
        <div>
          <form>
            <div className={styles.inputWrapper}>
              <label className={styles.label}>Old Password </label>
              <input className={styles.input} type="password" placeholder='Enter Old Password'/>
            </div>
            <div className={styles.inputWrapper}>
              <label className={styles.label}>New Password </label>
              <input className={styles.input} type= "password" placeholder='Enter New Password'/>
            </div>
            <div className={styles.inputWrapper}>
              <label className={styles.label}>Confirm Password</label>
              <input className={styles.input} type= "password" placeholder='Enter New Password'/>
            </div>
          </form>
        </div>
      </section>
    </div>
  )
}

export default index
