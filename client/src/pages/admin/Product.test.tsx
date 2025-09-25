import { act, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import axios from "axios";
import { toast } from "react-hot-toast";
import userEvent from "@testing-library/user-event";

// Setup Mock Components
jest.mock("../../components/Layout", () => ({ children }: any) => (
  <div data-testid="layout">{children}</div>
));

jest.mock("../../components/AdminMenu", () => () => (
  <div>Mocked AdminMenu</div>
));

// Setup Mock Toast
jest.mock("react-hot-toast", () => ({
  toast: {
    error: jest.fn(),
  },
}));

// Setup Mock API
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Component Under test
import Products from "./Products";

const fakeProducts = [
  {
    _id: "66db427fdb0119d9234b27f9",
    name: "Novel",
    slug: "novel",
    description: "A bestselling novel",
    price: 14.99,
    category: {
      _id: "66db427fdb0119d9234b27ef",
      name: "Book",
      slug: "book",
      __v: 0,
    },
    quantity: 200,
    shipping: true,
    createdAt: "2024-09-06T17:57:19.992Z",
    updatedAt: "2024-09-06T17:57:19.992Z",
    __v: 0,
  },
  {
    _id: "67a21772a6d9e00ef2ac022a",
    name: "NUS T-shirt",
    slug: "nus-tshirt",
    description: "Plain NUS T-shirt for sale",
    price: 4.99,
    category: {
      _id: "66db427fdb0119d9234b27ee",
      name: "Clothing",
      slug: "clothing",
      __v: 0,
    },
    quantity: 200,
    shipping: true,
    createdAt: "2024-09-06T17:57:19.992Z",
    updatedAt: "2024-09-06T17:57:19.992Z",
    __v: 0,
  },
  {
    _id: "67a2171ea6d9e00ef2ac0229",
    name: "The Law of Contract in Singapore",
    slug: "the-law-of-contract-in-singapore",
    description: "A bestselling book in Singapore",
    price: 54.99,
    category: {
      _id: "66db427fdb0119d9234b27ef",
      name: "Book",
      slug: "book",
      __v: 0,
    },
    quantity: 200,
    shipping: true,
    createdAt: "2024-09-06T17:57:19.992Z",
    updatedAt: "2024-09-06T17:57:19.992Z",
    __v: 0,
  },
];

// Setup Render
const renderPage = () => {
  render(
    <MemoryRouter initialEntries={["/dashboard/admin/products"]}>
      <Routes>
        <Route path="/dashboard/admin/products" element={<Products />} />
        <Route
          path="/dashboard/admin/product/:slug"
          element={<div>Mock Product Page</div>}
        />
      </Routes>
    </MemoryRouter>
  );
};

describe("Products Page", () => {
  it("Renders products from API", async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { products: fakeProducts } });

    renderPage();

    const renderedProducts = await screen.findAllByTestId(/div-product-/i);
    expect(renderedProducts).toHaveLength(fakeProducts.length);
  });

  it("Calls toast with error message when API fails", async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error("Network Error"));

    renderPage();

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Something Went Wrong");
    });
  });

  it("navigates to product detail page on click", async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { products: fakeProducts } });

    renderPage();

    const renderedProducts = await screen.findAllByTestId(/div-product-/i);

    await act(async () => {
      userEvent.click(renderedProducts[0]);
    });

    expect(await screen.findByText("Mock Product Page")).toBeInTheDocument();
  });
});
