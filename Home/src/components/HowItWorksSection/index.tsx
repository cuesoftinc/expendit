import styles from './styles'
import { IoIosLogIn } from 'react-icons/io'
import {BiSolidReport, BiCategory, BiDollarCircle} from 'react-icons/bi'
import { MdPersonAddAlt } from 'react-icons/md'
import {LiaFileInvoiceDollarSolid} from 'react-icons/lia'

function HowItWorks() {
  return (
    <section className={`${styles.sectionContainer} min-h-screen flex justify-center items-center`}>
      <div>
        <h2 className={styles.header}>Our Finance Solution Usage Flow</h2>
        <div className={styles.grid}>
          <div className={styles.cardContainer}>
            <div>
              <MdPersonAddAlt className={styles.icon} />
            </div>
            <div className="mt-2">
              <strong className={styles.cardTitle}>Create an account</strong>
              <p className={styles.cardContent}>Create an account by providing your email and choosing a secure passwords</p>
            </div>
          </div>
          <div className={styles.cardContainer}>
            <div>
              <IoIosLogIn className={styles.icon} />
            </div>
            <div>
              <strong className={styles.cardTitle}>Log into your account</strong>
              <p className={styles.cardContent}>With the credentials used in creating an account, log into your account</p>
            </div>
          </div>
          <div className={styles.cardContainer}>
            <div>
              <BiDollarCircle className={styles.icon} />
            </div>
            <div>
              <strong className={styles.cardTitle}>Input your budget</strong>
              <p className={styles.cardContent}>Input the amount of money you intend to spend in a specific period of time</p>
            </div>
          </div>
          <div className={styles.cardContainer}>
            <div>
              <BiCategory className={styles.icon} />
            </div>
            <div>
              <strong className={styles.cardTitle}>Customize Expense Categories</strong>
              <p className={styles.cardContent}>Create expense categories unique to you</p>
            </div>
          </div>
          <div className={styles.cardContainer}>
            <div>
              <LiaFileInvoiceDollarSolid className={styles.icon} />
            </div>
            <div>
              <strong className={styles.cardTitle}>Input your Expenses</strong>
              <p className={styles.cardContent}>Input an expense that includes date, amount and a category yoou created earlier</p>
            </div>
          </div>
          <div className={styles.cardContainer}>
            <div>
              <BiSolidReport className={styles.icon} />
            </div>
            <div>
              <strong className={styles.cardTitle}>View Real-Time Reports</strong>
              <p className={styles.cardContent}>View real-time reports about your expenses based on the data you provided</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;
