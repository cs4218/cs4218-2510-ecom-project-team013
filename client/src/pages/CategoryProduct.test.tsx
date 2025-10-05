import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "react-hot-toast";
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

// Setup Mock Toast
jest.mock("react-hot-toast", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Setup Mock API
jest.mock("../api", () => ({
  product: {
    getProductsByCategory: jest.fn(),
  },
}));

// Component Under test
import CategoryProduct from "./CategoryProduct";

const mockCategory = { name: "Electronics", slug: "electronics" };

const mockProducts = [
  {
    _id: "1",
    name: "Product 1",
    slug: "product-1",
    price: 199.99,
    description: "Product Description",
  },
  {
    _id: "2",
    name: "Product 2",
    slug: "product-2",
    price: 299.5,
    description: "Product Description",
  },
];

// Setup Render
const renderPage = () => {
  render(
    <MemoryRouter initialEntries={["/category/electronics"]}>
      <Routes>
        <Route path="/category/:slug" element={<CategoryProduct />} />
      </Routes>
    </MemoryRouter>
  );
};

describe("CategoryProduct Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders category name and products after API call", async () => {
    mockedUseParams.mockReturnValue({ slug: "electronics" });

    (api.product.getProductsByCategory as jest.Mock).mockResolvedValueOnce({
      data: { category: mockCategory, products: mockProducts },
    });

    renderPage();

    expect(api.product.getProductsByCategory).toHaveBeenCalledWith(
      "electronics"
    );

    await waitFor(() => {
      expect(screen.getByText("Category - Electronics")).toBeInTheDocument();
    });

    mockProducts.forEach((p) => {
      expect(screen.getByTestId(`product_name_${p._id}`)).toHaveTextContent(
        p.name
      );
      expect(
        screen.getByTestId(`product_description_${p._id}`)
      ).toHaveTextContent(p.description.substring(0, 60));
      expect(screen.getByTestId(`product_price_${p._id}`)).toHaveTextContent(
        p.price.toLocaleString("en-US", { style: "currency", currency: "USD" })
      );
    });

    expect(
      screen.getByText(`${mockProducts.length} result found`)
    ).toBeInTheDocument();
  });

  it("renders slug category name if no catefory and products after API call", async () => {
    mockedUseParams.mockReturnValue({ slug: "electronics" });

    (api.product.getProductsByCategory as jest.Mock).mockResolvedValueOnce({
      data: { category: {}, products: [] },
    });

    renderPage();

    expect(api.product.getProductsByCategory).toHaveBeenCalledWith(
      "electronics"
    );

    await waitFor(() => {
      expect(screen.getByText("Category - electronics")).toBeInTheDocument();
    });

    expect(screen.getByText(`0 result found`)).toBeInTheDocument();
  });

  it("navigates to product details when 'More Details' is clicked", async () => {
    mockedUseParams.mockReturnValue({ slug: "electronics" });

    (api.product.getProductsByCategory as jest.Mock).mockResolvedValueOnce({
      data: { products: mockProducts, category: mockCategory },
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Category - Electronics")).toBeInTheDocument();
    });

    const button = screen.getByTestId("product_more_details_1");
    await act(async () => {
      userEvent.click(button);
    });

    expect(mockedNavigate).toHaveBeenCalledWith(
      `/product/${mockProducts[0].slug}`
    );
  });

  it("renders product image with correct alt text and src", async () => {
    mockedUseParams.mockReturnValue({ slug: "electronics" });
    (api.product.getProductsByCategory as jest.Mock).mockResolvedValueOnce({
      data: { products: mockProducts, category: mockCategory },
    });

    renderPage();

    const img = await screen.findByTestId("product_img_1");

    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("alt", "Product 1");
    expect(img).toHaveAttribute("src", "/api/v1/product/product-photo/1");
  });

  it("renders product prices formatted as USD currency", async () => {
    mockedUseParams.mockReturnValue({ slug: "electronics" });

    (api.product.getProductsByCategory as jest.Mock).mockResolvedValueOnce({
      data: { products: mockProducts, category: mockCategory },
    });

    renderPage();

    const price1 = await screen.findByTestId("product_price_1");
    const price2 = await screen.findByTestId("product_price_2");

    expect(price1).toBeInTheDocument();
    expect(price2).toBeInTheDocument();

    expect(price1).toHaveTextContent("$199.99");
    expect(price2).toHaveTextContent("$299.50");

    expect(price1.textContent).toBe(
      mockProducts[0].price.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
      })
    );
  });

  it("renders product descriptions truncated to 60 characters", async () => {
    mockedUseParams.mockReturnValue({ slug: "electronics" });

    const longMockProducts = mockProducts.map((p) => ({
      ...p,
      description:
        "Long Description Long Description Long Description Long Description Long Description Long Description Long Description",
    }));

    (api.product.getProductsByCategory as jest.Mock).mockResolvedValueOnce({
      data: { products: longMockProducts, category: mockCategory },
    });

    renderPage();

    for (const p of longMockProducts) {
      const descEl = await screen.findByTestId(`product_description_${p._id}`);
      expect(descEl).toBeInTheDocument();

      const expectedText = p.description.substring(0, 60) + "...";
      expect(descEl).toHaveTextContent(expectedText);
    }
  });

  it("handles API error gracefully", async () => {
    mockedUseParams.mockReturnValue({ slug: "electronics" });

    (api.product.getProductsByCategory as jest.Mock).mockRejectedValueOnce(
      new Error("Network error")
    );

    renderPage();

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Something went wrong in getting the data"
      )
    );
  });

  it("does not call getProductsByCategory when params.slug is missing", async () => {
    mockedUseParams.mockReturnValue({});

    const mockGetProductsByCategory = jest.fn();
    jest
      .spyOn(api.product, "getProductsByCategory")
      .mockImplementation(mockGetProductsByCategory);

    renderPage();

    await waitFor(() => {
      expect(mockGetProductsByCategory).not.toHaveBeenCalled();
    });
  });
});
