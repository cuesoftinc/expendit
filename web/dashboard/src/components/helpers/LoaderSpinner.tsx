"use client"

import React from 'react';

const LoaderSpinner = ({ style, variant, }: { style: string, variant: string}) => {
  return (
    <div className={`${style} ${variant} rounded-full animate-spin`} />
  )
}

export default LoaderSpinner