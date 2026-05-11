import styles from './styles';
import Image from 'next/image';
import User from '../../assets/images/user.png';
import Log from '../../assets/images/log.png';
import Dollar from '../../assets/images/dollar.png';
import Folder from '../../assets/images/folder.png';
import DollarBook from '../../assets/images/dollarbook.png';
import RealTime from '../../assets/images/realtime.png';

function HowItWorks() {
  const grids = [
    {
      title: "Create an account",
      sub_title: "Create an Account by providing your email and choosing a secure password",
      imgSrc: User,
    },
    {
      title: "Log into your account",
      sub_title: "With the credentials used in creating an account, log into your account",
      imgSrc: Log,
    },
    {
      title: "Input your budget",
      sub_title: "Input the amount of money you intend to spend in a specific period of time",
      imgSrc: Dollar,
    },
    {
      title: "Customize Expense Categories",
      sub_title: "Create expense categories unique to you",
      imgSrc: Folder,
    },
    {
      title: "Input your Expenses",
      sub_title: "Input an expense that includes date, amount and a category you created earlier",
      imgSrc: DollarBook,
    },
    {
      title: "View Real-Time Reports",
      sub_title: "View real-time reports about your expenses based on the data you provided",
      imgSrc: RealTime,
    }
  ];
  
  return (
    <section className={styles.sectionContainer}>
      <div>
        <h2 className={styles.header}>Our Finance Solution Usage Flow</h2>
        <div className={styles.grid}>
          {grids.map((grid, index) => (
            <div className={styles.cardContainer} key={index}>
              <div>
                <Image src={grid.imgSrc} alt={`${grid.title} icon`} />
              </div>
              <div className="flex flex-col gap-3">
                <strong className={styles.cardTitle}>{grid.title}</strong>
                <p className={styles.cardContent}>{grid.sub_title}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;
