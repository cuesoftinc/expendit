import { render, screen } from "@testing-library/react";
import HeroSection from "@/components/HeroSection/Index";

describe("HomePage", () => {
  // Test to make sure the Navbar component renders
  it("renders a hero-section", () => {
    render(
      <HeroSection />
    );

    const Herosection = screen.getByTestId("hero-section");
    expect(Herosection).toBeInTheDocument();
  });
});
