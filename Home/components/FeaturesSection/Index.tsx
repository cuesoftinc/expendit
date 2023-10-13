"use client"

import React from 'react';
import styles from './styles';
import { TbTrack, TbMoneybag, TbReportMoney } from 'react-icons/tb';
import { IconType } from 'react-icons';

type props = {
  heading: string; 
  subText: string;
  icon: any;
};
const FeatureCard = ({ heading, subText, icon  }: props) => {
  return(
    <div className={styles.cardContainer}>
      <span className='text-purple-600'>{icon}</span>
      <h2 className='font-semibold my-6'>{heading}</h2>
      <p>{subText}</p>
    </div>
  )
};

const FeaturesSection = () => {
  return (
    <section className={styles.sectionContainer} id='features'>
      <div className={styles.innerContainer}>
        <h1 className={styles.header}>
          Solution for personal 
          and <br /> business need
        </h1>
        <div className={styles.cardsContainer}>
          <FeatureCard 
            icon={<TbTrack fontSize={25} />}
            heading="Expense Tracking"
            subText='Expense tracking is the heartbeat of your journey to financial wellness. 
            This essential feature is the key to understanding, managing, and ultimately 
            mastering your money. With expense tracking, you&apos;ll experience a level of
            clarity and control over your finances like never before.'
          />
          <FeatureCard 
            icon={<TbMoneybag fontSize={25} />}
            heading="Budget Planning"
            subText='Budget planning is the cornerstone of financial stability and prosperity, 
            and it&apos;s at the heart of our expense tracker. This feature is your compass, 
            helping you navigate the sea of expenses with confidence and purpose.'
          />
          <FeatureCard 
            icon={<TbReportMoney fontSize={25} />}
            heading="Finance Report"
            subText='In the dynamic world of personal finance, a finance report is your trusty guide, 
            providing invaluable insights and a clear path to financial success. Within our 
            expense tracker, this feature serves as your beacon of light.'
          />
        </div>
      </div>
    </section>
  )
}

export default FeaturesSection
// Expense tracking TbTrack, AiOutlineLineChart
// Budget planning GiMoneyStack, TbMoneybag
// Finance report TbReportMoney, TbReportAnalytics