"use client"

import HowItWorks from "@/components/HowItWorks"
import { Fragment } from 'react';
import HeroSection from '@/components/HeroSection/Index';
import FeaturesSection from '@/components/FeaturesSection/Index';
import CTASection from '@/components/CTASection/Index';

export default function Home() {
  return (
    <Fragment>
      <HeroSection />
      <FeaturesSection />
      <CTASection />
      <HowItWorks />
    </Fragment>
  )
}
