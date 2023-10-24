import styles from './styles';
import {FaLocationDot} from 'react-icons/fa6'
import {IoMdContact} from 'react-icons/io'
import {BsClockFill} from 'react-icons/bs'

const Contact = () => {
  return (
    <main className="">
      <div className= {styles.sectionContainer}>
        <div className={styles.innerContainer}>
          <div className={styles.grid}>
            <div className='md:ps-14'>
              <h1 className={styles.header}>Get a personal consultation</h1>
              <ul>
                <li className={styles.listItem}>
                  <div className={styles.itemWrapper}>
                    <FaLocationDot className={styles.icon} />
                    <p>Office</p>
                  </div>
                  <p className={styles.itemParagraph}>39 Alfred Rewane Road, Mulliner Towers, Ikoyi, 101233, Lagos, Nigeria</p>
                </li>
                <li className={styles.listItem}>
                  <div className={styles.itemWrapper}>
                    <IoMdContact className={styles.icon} />
                    <p>Office</p>
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
                  <label>How can we help? </label>
                  <textarea className={styles.input}/>
                </div>
                <div className={styles.btn}>
                  <input className={styles.submit} type="submit" value="Submit"/>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

export default Contact
