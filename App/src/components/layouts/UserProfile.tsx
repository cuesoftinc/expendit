import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useNavContext, useHomeContext } from '@/context';
import { AiOutlineClose } from 'react-icons/ai';
import { logoutApi } from '@/API/APIS/authApi';

import styles from './styles';
import { useRouter } from 'next/navigation';
import { userProfileData } from '@/dummy';
import Avatar from '@/assets/images/avatar.jpg';

const UserProfile = () => {
  const router = useRouter();
  const { setIsProfileOpen, setIsNavOpen } = useNavContext();
  const { user, setFormLoading } = useHomeContext();
  const picture = null;

  const handleClick = (e: any, url:string) => {
    setIsProfileOpen(false);

    router.push(url);
  };

  const handleLogout = async () => {
    setIsNavOpen(false);
    await logoutApi({router, setFormLoading });
  };

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
        <div className='h-24 w-24 rounded-full '>
        {picture ? <Image
          className="h-full w-full"
          src={Avatar}
          alt="user-profile"
          /> 
          : <p className={`${styles.imgText}`}>{user?.first_name.charAt(0)}</p>}
        </div>
        <div>
          <p className={styles.textXl}> {`${user?.first_name} ${user?.last_name}`}</p>
          <p className={styles.textSm}>Administrator</p>
          <p className={styles.textSmB}>{user?.email}</p>
        </div>
      </div>
      <div>
        {userProfileData.map((item, index) => (
          <div key={index} className={styles.barCont}
          onClick={(e) => handleClick(e, item.url)}>
            <button
              type="button"
              style={{ color: item.iconColor, backgroundColor: item.iconBg }}
              className="text-xl rounded-lg p-3"
            >
              {item.icon}
            </button>
            <div>
              <p className="font-semibold">{item.title}</p>
              <p className={styles.textSm}> {item.desc} </p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 w-full">
        <button className={styles.profileLogout}
          onClick={handleLogout}>
         Logout
        </button>
      </div>
    </div>

  );
};

export default UserProfile;
