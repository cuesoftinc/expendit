import styles from './styles';
import {FaLocationDot} from 'react-icons/fa6'
import {BsClockFill} from 'react-icons/bs'
import {MdEmail} from 'react-icons/md'

const Contact = () => {
  return (
    <div className= {styles.sectionContainer} id='contact'>
      <div className={styles.innerContainer}>
        <div className={styles.grid}>
          <div className='md:ml-0 ml-2'>
            <h1 className={styles.header}>Contact Us</h1>
            <p className='mb-7'>Get a personal consultation</p>
            <ul>
              <li className={styles.listItem}>
                <div className={styles.itemWrapper}>
                  <FaLocationDot className={styles.icon} />
                  <p>Office</p>
                </div>
                <p className={styles.itemParagraph}>
                  39 Alfred Rewane Road, Mulliner Towers, Ikoyi, 101233, Lagos, Nigeria
                </p>
              </li>
              <li className={styles.listItem}>
                <div className={styles.itemWrapper}>
                  <MdEmail className={styles.icon} />
                  <p>Email</p>
                </div>
                <p className={styles.itemParagraph}>info@expendit.com</p>
              </li>
              <li className={styles.listItem}>
                <div className={styles.itemWrapper}>
                  <BsClockFill className={styles.icon} />
                  <p>Open hours</p>
                </div>
                <p className={styles.itemParagraph}>Monday - Friday:<br/> 9am - 5pm</p>
              </li>
            </ul>
          </div>
          <div>
            <form className={styles.form}>
              <div className={styles.inputContainer}>
                <label htmlFor='name'>Name </label>
                <input className={styles.input} type="text"/>
              </div>
              <div className={styles.inputContainer}>
                <label htmlFor='email'>Email </label>
                <input className={styles.input} type="email"/>
              </div>
              <div className={styles.inputContainer}>
                <label htmlFor='subject'>Subject </label>
                <input className={styles.input} type="text"/>
              </div>
              <div className={styles.inputContainer}>
                <label>How can we Help You? </label>
                <textarea className={styles.textarea}/>
              </div>
              <div className={styles.btn}>
                <input className={styles.submit} type="submit" value="Send a message"/>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Contact
