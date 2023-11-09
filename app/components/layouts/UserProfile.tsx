import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useNavContext } from '@/context';
import { AiOutlineClose } from 'react-icons/ai';

import styles from './styles';
import { userProfileData } from '@/dummy';
import Avatar from '@/assets/images/avatar.jpg';

const UserProfile = () => {
  const { setIsProfileOpen } = useNavContext();

  return (
    <div className={styles.userProfileCont}>
      <div className={styles.between}>
        <p className={styles.textLg}>User Profile</p>
        <button className='rounded-md p-2 bg-grayTheme'
          onClick={() => setIsProfileOpen(false)}>
          <AiOutlineClose fontSize={20} />
        </button>
      </div>
      <div className={styles.avatarCont}>
        <Image
          className="rounded-full h-24 w-24"
          src={Avatar}
          alt="user-profile"
        />
        <div>
          <p className={styles.textXl}> Akolade Femi </p>
          <p className={styles.textSm}>  Administrator   </p>
          <p className={styles.textSmB}> info@shop.com </p>
        </div>
      </div>
      <div>
        {userProfileData.map((item, index) => (
          <div key={index} className={styles.barCont}>
            <Link href={item.url}>
              <button
                type="button"
                style={{ color: item.iconColor, backgroundColor: item.iconBg }}
                className="text-xl rounded-lg p-3"
              >
                {item.icon}
              </button>
            </Link>
            <div>
              <p className="font-semibold">{item.title}</p>
              <p className={styles.textSm}> {item.desc} </p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 w-full">
        <button className={styles.profileLogout}
          onClick={() => {}}>
         Logout
        </button>
      </div>
    </div>

  );
};

export default UserProfile;
