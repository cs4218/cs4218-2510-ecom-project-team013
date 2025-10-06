import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import routes from "./routes";

jest.mock("./pages/HomePage", () => () => (
  <div data-testid="home-page">Home Page</div>
));
jest.mock("./pages/Pagenotfound", () => () => (
  <div data-testid="not-found-page">Not Found Page</div>
));
jest.mock("./pages/About", () => () => (
  <div data-testid="about-page">About Page</div>
));

const renderAppWithRoute = (path?: string) => {
  const app = (
    <RouterProvider
      router={createMemoryRouter(routes, {
        initialEntries: path ? [path] : undefined,
      })}
    />
  );
  return render(app);
};

describe("App routes rendering", () => {
  it("should render the home page at initial load", () => {
    renderAppWithRoute();
    expect(screen.getByTestId("home-page")).toBeInTheDocument();
  });

  it("should render the home page when navigating to the root", () => {
    renderAppWithRoute("/");
    expect(screen.getByTestId("home-page")).toBeInTheDocument();
  });

  it("should render NotFound page for unknown route", () => {
    renderAppWithRoute("/unknown-route");
    expect(screen.getByTestId("not-found-page")).toBeInTheDocument();
  });

  it("should render About page when navigating to '/about'", () => {
    renderAppWithRoute("/about");
    expect(screen.getByTestId("about-page")).toBeInTheDocument();
  });

  // TODO: Add integration tests with guarded routes (Private, AdminRoute)
});
