"use client";

import React, { Dispatch, SetStateAction } from "react";
import Link from "next/link";
import { AiOutlineClose } from "react-icons/ai";
import { navLinks } from "./index";
import styles from "./styles";

interface Props {
  setOpenNav: Dispatch<SetStateAction<boolean>>;
}

const MobileNavbar = ({ setOpenNav }: Props) => {
  const handleClick = () => {
    setOpenNav(false);
  };

  return (
    <div className={styles.mobileNavCont}>
      <div className={styles.closeNavCont}>
        <AiOutlineClose
          fontSize={25}
          className="cursor-pointer"
          onClick={() => setOpenNav(false)}
        />
      </div>
      <div className="text-center">
        <ul className={styles.mobileNavlinks}>
          {navLinks.map((link, index) => (
            <li
              className="hover:text-purple-600"
              key={index}
              onClick={handleClick}
            >
              <Link href={link.url}>{link.title}</Link>
            </li>
          ))}
        </ul>
        <Link href="/signin" className={styles.btnOne} onClick={handleClick}>
          Login
        </Link>
      </div>
    </div>
  );
};

export default MobileNavbar;
