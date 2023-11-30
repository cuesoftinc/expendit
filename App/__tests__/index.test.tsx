import { render, screen } from "@testing-library/react";
import Home from '../src/app/page';


const setIsNavOpen = jest.fn();

describe("HomePage", () => {
  it("renders a navbar", () => {
    render(
      <Home />
    );

    const Homepage = screen.getByTestId("homepage");
    expect(Homepage).toBeInTheDocument();
  }); 
});
