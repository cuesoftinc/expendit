import styles from './styles'

function HowItWorks() {
  return (
    <section className={`${styles.sectionContainer} min-h-screen flex justify-center items-center`}>
      <div>
        <h2 className={styles.header}>Our Finance Solution Usage Flow</h2>
        <div className={styles.grid}>
          <div className={styles.cardContainer}>
            <p className={styles.number}>01</p>
            <div className="mt-2">
              <strong className='text-2xl'>Create an account</strong>
              <p>Create an account by providing yoour email and choosing a secure passwords</p>
            </div>
          </div>
          <div className={styles.cardContainer}>
            <p className={styles.number}>02</p>
            <div>
              <strong className='text-xl'>Login and get access to your dashboard</strong>
              <p>With the credentials used in creating an account, log into your account</p>
            </div>
          </div>
          <div className={styles.cardContainer}>
            <p className={styles.number}>03</p>
            <div>
              <strong className='text-xl'>Input your customized budget</strong>
              <p>Input the amount of money you intend to spend in a specific period of time</p>
            </div>
          </div>
          <div className={styles.cardContainer}>
            <p className={styles.number}>04</p>
            <div>
              <strong className='text-xl'>Customize Expense Categories</strong>
              <p>Create expense categories unique to you</p>
            </div>
          </div>
          <div className={styles.cardContainer}>
            <p className={styles.number}>05</p>
            <div>
              <strong className='text-xl'>Input your Expenses</strong>
              <p>Input an expense that includes date, amount and a category yoou created earlier</p>
            </div>
          </div>
          <div className={styles.cardContainer}>
            <p className={styles.number}>06</p>
            <div>
              <strong>View Real-Time Reports about your expenses</strong>
              <p>View real-time reports based on the data you provided</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;
