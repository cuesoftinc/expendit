import { render, screen } from "@testing-library/react";
import '../src/setupTests';
import '@testing-library/jest-dom';
import { HomeProvider, NavProvider, SessionProvider } from '../src/context';
import Home from '../src/app/page';
// import TopBoard from "../src/components/home/TopBoard";

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
  }
}));


// jest.mock("next/router", () => ({
//   useRouter() {
//       return {
//           route: "/",
//           pathname: "",
//           query: "",
//           asPath: "",
//       };
//   },
// }));

describe("HomePage", () => {
  it("renders a Homepage", () => {
    // render(
    //   <HomeProvider>
    //     <NavProvider>
    //       {/* <SessionProvider> */}
    //         <Home />
    //       {/* </SessionProvider> */}
    //     </NavProvider>
    //   </HomeProvider>
    // );

    // console.log(screen.debug())
    // const Homepage = screen.getByTestId("top-board");
    // expect(Homepage).toBeInTheDocument();
  }); 
});
