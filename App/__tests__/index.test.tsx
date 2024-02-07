import { render, screen } from "@testing-library/react";
import '@testing-library/jest-dom';
import { HomeProvider, NavProvider, SessionProvider } from '../src/context';
import Home from '../src/app/page';

describe("HomePage", () => {
  it("renders a Homepage", () => {
    render(
      <HomeProvider>
        <NavProvider>
          <SessionProvider>
            <Home />
          </SessionProvider>
        </NavProvider>
      </HomeProvider>
    );

    const Homepage = screen.getByTestId("homepage");
    expect(Homepage).toBeInTheDocument();
  }); 
});
