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
  // W2: `/` is the Part A Brex-editorial home (pages.md); the legacy
  // marketing sections await their W3 quarantine tranche.
  it("renders the Part A hero", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "See every naira. File every tax.",
      }),
    ).toBeInTheDocument();
  });
});
