"use client"

import HowItWorks from "@/components/HowItWorksSection"
import HeroSection from '@/components/HeroSection/Index';
import FeaturesSection from '@/components/FeaturesSection/Index';
import CTASection from '@/components/CTASection/Index';
import Contact from "@/components/ContactSection";
import Services from "@/components/ServiceSection";

export default function Home() {
  return (
    <>
      <HeroSection />
      <Services />
      <FeaturesSection />
      <CTASection />
      <HowItWorks />
      <Contact />
    </>
  )
}
