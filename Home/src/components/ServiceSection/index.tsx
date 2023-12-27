import { useEffect, useState } from 'react';
import Image from 'next/image';
import styles from './styles';
import savings from '../../assets/images/savings.jpg';
import finance from '../../assets/images/finance.jpg';
import budget from '../../assets/images/budget2.jpg';
import revenue from '../../assets/images/revenue.jpg';

const Services =  () =>{
  const tabs = [
    "Plan Your Finance",
    "Create Monthly Budget",
    "Revenue Allocation",
    "Plan Savings"
  ];

  const tabImages = [
    finance,
    budget,
    revenue,
    savings
  ]

  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (index: number) => {
    setActiveTab(index)
  }
  
  useEffect(() => {
    let currentTab = 0; 

    let intervalId = setInterval(() => {
      currentTab = (currentTab + 1) % tabs.length;
      setActiveTab(currentTab);
    }, 6000);

    return () => clearInterval(intervalId);
  }, []);


  return(
    <main className={styles.sectionContainer}>
      <div className=''>
        <div className='w-full overflow-x-hidden'>
          <div className={styles.tabList(activeTab)}>
            {tabs.map((tab, index) => (
              <div
                key={index}
                className={`${activeTab === index 
                  ? `${styles.bgBlack}` 
                  : `${styles.bgGray}`} 
                  ${styles.tab}`
                }
                onClick={() => handleTabChange(index)}
                ><p className={styles.fluid_text}>{tab}</p>
              </div>
            ))}
          </div>
        </div>

        {tabImages.map((image, index) => (
         activeTab === index 
         && <div key={index} className='tab-img'>
            <Image src={image} alt="image" className={styles.img} />
          </div>
        ))}
      </div>
    </main>
  )
};

export default Services