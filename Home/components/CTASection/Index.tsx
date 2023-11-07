"use client"

import React from 'react';
import styles from './styles';
import Image from 'next/image';
import { FiCheckCircle } from 'react-icons/fi';
import handshake from '@/assets/images/handshake.png';

const CTASection = () => {
  const features = [
    'Simplified Expense Tracking',
    'Personalized Budgeting',
    'Well detailed reports',
    'Seamless Cross-Device Access',
    'Cloud based architecture'
  ];

  return (
    <section className={styles.sectionContainer} id='services'>
      <h1 className={styles.sectionHeader}>
        Ready to Take Control of <br /> Your Finances?
      </h1>
      <p className={styles.subtext}>
        Get Started with Our Expense Tracker Web App Today! Start Tracking, 
        <br /> Budgeting, and Planning for a Bright Financial Future.
      </p>
      <div className='text-center my-8'>
        <button type='button' className={styles.btn}>Get started</button>
      </div>
      <div className={styles.featuresContainer}>
        <div className='md:w-1/2 w-full'>
          <Image src={handshake} alt='A Phone' className={styles.img} />
        </div>
        <div className={styles.rightSide}>
          <h1 className={styles.headerTwo}>
            Helping you to make sound financial decisions
          </h1>
          <p className={styles.subtextTwo}>
            We help put you in control of your financial journey through:
          </p>
          <div className={styles.features}>
            {
             features.map((feature, index) => (
              <div className={styles.feature} key={index}>
                <FiCheckCircle fontSize={20} color="#A259FF" />
                <p>{feature}</p>
              </div>
             )) 
            }
          </div>
        </div>
      </div>
    </section>
  )
}

export default CTASection