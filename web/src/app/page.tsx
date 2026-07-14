"use client";

import { Fragment } from "react";
import HowItWorks from "@/components/marketing/how-it-works-section/HowItWorksSection";
import HeroSection from "@/components/marketing/hero-section/HeroSection";
import FeaturesSection from "@/components/marketing/features-section/FeaturesSection";
import CTASection from "@/components/marketing/cta-section/CtaSection";
import Contact from "@/components/marketing/contact-section/ContactSection";
import Services from "@/components/marketing/service-section/ServiceSection";
import OpenSourceSection from "@/components/marketing/open-source-section/OpenSourceSection";
import Footer from "@/components/marketing/footer/Footer";

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
