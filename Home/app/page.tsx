"use client"

import HowItWorks from "@/components/HowItWorksSection"
import HeroSection from '@/components/HeroSection/Index';
import FeaturesSection from '@/components/FeaturesSection/Index';
import CTASection from '@/components/CTASection/Index';
import Contact from "@/components/ContactSection";

export default function Home() {
  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <CTASection />
      <HowItWorks />
      <Contact />
    </>
  )
}
