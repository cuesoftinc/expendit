"use client";

import { Fragment } from "react";
import HowItWorks from "@/components/marketing/HowItWorksSection";
import HeroSection from "@/components/marketing/HeroSection/Index";
import FeaturesSection from "@/components/marketing/FeaturesSection/Index";
import CTASection from "@/components/marketing/CTASection/Index";
import Contact from "@/components/marketing/ContactSection";
import Services from "@/components/marketing/ServiceSection";
import OpenSourceSection from "@/components/marketing/OpenSourceSection";
import Footer from "@/components/marketing/Footer";

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
      <Footer />
    </Fragment>
  );
}
