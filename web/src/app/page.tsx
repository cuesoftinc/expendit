"use client";

import { Fragment } from "react";
import HowItWorks from "@/components/marketing/how-it-works-section";
import HeroSection from "@/components/marketing/hero-section/index";
import FeaturesSection from "@/components/marketing/features-section/index";
import CTASection from "@/components/marketing/cta-section/index";
import Contact from "@/components/marketing/contact-section";
import Services from "@/components/marketing/service-section";
import OpenSourceSection from "@/components/marketing/open-source-section";
import Footer from "@/components/marketing/footer";

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
