"use client"

import { useState, useEffect } from 'react';

export const useCustomState = () => {
  const [screenSize, setScreenSize] = useState<number>(globalThis.window?.innerWidth)
  const [mobile, setMobile] = useState<boolean>(false)

  useEffect(() => {
    const handleResize = () => setScreenSize(window.innerWidth);
    window.addEventListener('resize', handleResize);
    handleResize();
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if(screenSize <= 910){
        setMobile(true);
      } else{
      setMobile(false);
    }
  }, [screenSize])

  return [mobile]
}
