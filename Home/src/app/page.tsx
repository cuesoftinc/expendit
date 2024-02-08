"use client";

import { Fragment } from "react";
import HowItWorks from "@/components/HowItWorksSection";
import HeroSection from "@/components/HeroSection/Index";
import FeaturesSection from "@/components/FeaturesSection/Index";
import CTASection from "@/components/CTASection/Index";
import Contact from "@/components/ContactSection";
import Services from "@/components/ServiceSection";
import OpenSourceSection from "@/components/OpenSourceSection";

export default function Home() {
  return (
    <Fragment>
      <HeroSection />
      <Services />
      <FeaturesSection />
      <CTASection />
      <HowItWorks />
      <OpenSourceSection />
      <Contact />
    </Fragment>
  );
}
