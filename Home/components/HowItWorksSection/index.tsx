import styles from './styles'

function HowItWorks() {
  return (
    <section className={`${styles.sectionContainer} h-screen flex justify-center items-center`}>
      <div>
        <h2 className="text-3xl font-semibold mb-4 flex justify-center items-center">How It Works</h2>
        <div className={styles.grid}>
          <div className={styles.card}>
            <p className={styles.number}>01</p>
            <p className="mt-2"><strong>Create an account</strong></p>
          </div>
          <div className={styles.card}>
            <p className={styles.number}>02</p>
            <p><strong>Login and get access to your dashboard</strong></p>
          </div>
          <div className={styles.card}>
            <p className={styles.number}>03</p>
            <p><strong>Input your customized budget for a specific period of time</strong></p>
          </div>
          <div className={styles.card}>
            <p className={styles.number}>04</p>
            <p><strong>Input your Expenses for that period </strong></p>
          </div>
          <div className={styles.card}>
            <p className={styles.number}>05</p>
            <p><strong>View Real-Time Reports about your expenses</strong></p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;
