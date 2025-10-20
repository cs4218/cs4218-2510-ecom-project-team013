import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import toast, { Toaster } from "react-hot-toast";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import api from "../api";

// Setup Mock Components
jest.mock("../components/Layout", () => ({ children }: any) => (
  <div data-testid="layout">{children}</div>
));

// Setup React Router
const mockedNavigate = jest.fn();
const mockedUseParams = jest.fn();

jest.mock("react-router-dom", () => ({
  ...(jest.requireActual("react-router-dom") as any),
  useNavigate: () => mockedNavigate,
  useParams: () => mockedUseParams(),
}));

// Setup Mock API
jest.mock("../api", () => ({
  product: {
    getProductsByCategory: jest.fn(),
  },
}));

// Component Under test
import CategoryProduct from "./CategoryProduct";

// Setup Render
const renderPage = () => {
  render(
    <MemoryRouter initialEntries={["/category/electronics"]}>
      <Routes>
        <Route path="/category/:slug" element={<CategoryProduct />} />
      </Routes>
      <Toaster />
    </MemoryRouter>
  );
};

describe("CategoryProduct Component", () => {
  beforeAll(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: jest.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await act(async () => {
      toast.dismiss();
    });
    await waitFor(
      () => {
        expect(screen.queryByRole("status")).not.toBeInTheDocument();
      },
      { timeout: 3000 }
    );
    cleanup();
  });

  it("handles API error gracefully", async () => {
    mockedUseParams.mockReturnValue({ slug: "electronics" });

    (api.product.getProductsByCategory as jest.Mock).mockRejectedValueOnce(
      new Error("Network error")
    );

    renderPage();

    await waitFor(() => {
      expect(
        screen.getByText("Something went wrong in getting the data")
      ).toBeInTheDocument();
    });
  });
});
