import { render, screen } from "@testing-library/react";
import "../src/setup-tests";
import "@testing-library/jest-dom";
import Home from "../src/app/page";

jest.mock("next/navigation", () => ({
  useRouter() {
    return {
      prefetch: () => null,
      push: () => jest.fn(),
      route: "",
      pathname: "",
      query: "",
      asPath: "",
    };
  },
}));

describe("HomePage", () => {
  it("renders the landing page hero", () => {
    render(<Home />);

    const hero = screen.getByTestId("hero-section");
    expect(hero).toBeInTheDocument();
  });
});
