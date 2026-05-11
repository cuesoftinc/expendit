"use client"

import { useState, useEffect,  Dispatch, SetStateAction } from 'react';

type setState = Dispatch<SetStateAction<boolean>>;

export const useCustomState = (setOpenNav: setState ) => {
  const [screenSize, setScreenSize] = useState<number >(globalThis.window?.innerWidth)
  const [mobile, setMobile] = useState<null | boolean>(null)

  useEffect(() => {
    const handleResize = () => setScreenSize(window.innerWidth);
    window.addEventListener('resize', handleResize);
    handleResize();
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setOpenNav(false);
    if(screenSize <= 910){
        setMobile(true);
      } else{
      setMobile(false);
    }
  }, [screenSize])

  return [mobile]
}
