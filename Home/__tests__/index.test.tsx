import { render, screen } from "@testing-library/react";
import Home from '../src/components/HeroSection/Index';
import '@testing-library/jest-dom';


describe("Landing Page", () => {
  it("renders a Hero section", () => {
    render(
      <Home />
    );

    const HeroSection = screen.getByTestId("hero-section");
    expect(HeroSection).toBeInTheDocument();
  }); 
});
