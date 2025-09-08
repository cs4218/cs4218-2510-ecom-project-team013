// client/src/pages/ProductDetails.test.tsx
import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import axios from "axios";
import ProductDetails from "./ProductDetails";
import { MemoryRouter, Route, Routes } from "react-router-dom";

/** Inline axios mock (avoids loading ESM axios from node_modules) */
jest.mock("axios", () => {
  const mock = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    create: () => mock,
    defaults: { headers: { common: {} } },
  };
  return { __esModule: true, default: mock };
});

// Cast to a simple shape we control
const mockedAxios = axios as unknown as {
  get: jest.Mock<any, any>;
  post: jest.Mock<any, any>;
  put: jest.Mock<any, any>;
  delete: jest.Mock<any, any>;
};

// Mock Layout to a simple passthrough so we don't test app shell
// NOTE: Must match the import in ProductDetails.tsx: "../components/Layout"
jest.mock("../components/Layout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
}));

// Mock useNavigate while keeping the rest of react-router-dom real
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => {
  const real = jest.requireActual("react-router-dom");
  return {
    ...real,
    useNavigate: () => mockNavigate,
  };
});

function renderWithSlug(slugPath: string) {
  return render(
    <MemoryRouter initialEntries={[slugPath]}>
      <Routes>
        <Route path="/product/:slug" element={<ProductDetails />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("ProductDetails (unit)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Verifies: when a slug is present, the component requests the product by slug,
   * then requests related products with product._id & category._id, and renders
   * product details (name, description, formatted price, category, main image).
   */
  test("fetches product & related by slug and renders details", async () => {
    const product = {
      _id: "prod123",
      name: "Test Product",
      description: "A very nice product",
      price: 123.45,
      slug: "test-product",
      category: { _id: "cat9", name: "Gadgets" },
    };
    const related = [
      {
        _id: "rel1",
        name: "Related One",
        description: "Rel 1 desc ...",
        price: 10,
        slug: "related-one",
      },
    ];

    mockedAxios.get
      .mockResolvedValueOnce({ data: { product } }) // get-product
      .mockResolvedValueOnce({ data: { products: related } }); // related-product

    renderWithSlug("/product/test-product");

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledWith(
        "/api/v1/product/get-product/test-product"
      );
    });

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledWith(
        `/api/v1/product/related-product/${product._id}/${product.category._id}`
      );
    });

    // Product details rendered
    expect(await screen.findByText("Product Details")).toBeInTheDocument();
    expect(screen.getByText(/Name :/)).toHaveTextContent("Name : Test Product");
    expect(screen.getByText(/Description :/)).toHaveTextContent(
      "Description : A very nice product"
    );
    expect(screen.getByText(/Price/)).toHaveTextContent("$123.45");
    expect(screen.getByText(/Category :/)).toHaveTextContent(
      "Category : Gadgets"
    );

    // Main image source derived from product._id
    const mainImg = screen.getByRole("img", { name: /Test Product/i });
    expect(mainImg).toHaveAttribute(
      "src",
      `/api/v1/product/product-photo/${product._id}`
    );
  });

  /**
   * Verifies: when related-products API returns an empty array, the "No Similar Products found"
   * empty state is shown (and no related product cards are rendered).
   */
  test("renders empty-state text when there are no related products", async () => {
    const product = {
      _id: "prodEmpty",
      name: "Solo",
      description: "Only one",
      price: 5,
      slug: "solo",
      category: { _id: "catA", name: "Misc" },
    };

    mockedAxios.get
      .mockResolvedValueOnce({ data: { product } }) // product
      .mockResolvedValueOnce({ data: { products: [] } }); // related

    renderWithSlug("/product/solo");

    expect(
      await screen.findByText(/No Similar Products found/i)
    ).toBeInTheDocument();
  });

  /**
   * Verifies: clicking "More Details" on a related product triggers navigate()
   * with the expected slug (interaction only; still unit-level).
   */
  test("navigates to related product on 'More Details' click", async () => {
    const product = {
      _id: "prod123",
      name: "Main",
      description: "Main desc",
      price: 99,
      slug: "main",
      category: { _id: "cat1", name: "Cat" },
    };
    const related = [
      {
        _id: "rel1",
        name: "Rel A",
        description: "Rel A desc ...",
        price: 42,
        slug: "rel-a",
      },
    ];

    mockedAxios.get
      .mockResolvedValueOnce({ data: { product } })
      .mockResolvedValueOnce({ data: { products: related } });

    renderWithSlug("/product/main");

    const btn = await screen.findByRole("button", { name: /More Details/i });
    fireEvent.click(btn);
    expect(mockNavigate).toHaveBeenCalledWith("/product/rel-a");
  });

  /**
   * Verifies: if the slug param is missing (params.slug undefined), no API calls
   * are attempted (the effect guard prevents fetch).
   */
  test("does not fetch when slug is missing", async () => {
    render(
      <MemoryRouter initialEntries={["/product"]}>
        <Routes>
          {/* No :slug param here */}
          <Route path="/product" element={<ProductDetails />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });
  });

  /**
   * Verifies: when product fetch rejects, component still renders a stable shell
   * (does not crash). We assert the heading appears.
   */
  test("handles product API failure without crashing", async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error("Network error"));
    renderWithSlug("/product/bad-slug");

    expect(await screen.findByText("Product Details")).toBeInTheDocument();
  });

  /**
   * Verifies: when the slug changes, the component re-fetches product & related.
   * We re-render with a different route and expect a second round of requests.
   */
  test("re-fetches when slug changes", async () => {
    const prodA = {
      _id: "A",
      name: "A",
      description: "desc A",
      price: 1,
      slug: "a",
      category: { _id: "c", name: "Cat" },
    };
    const prodB = {
      _id: "B",
      name: "B",
      description: "desc B",
      price: 2,
      slug: "b",
      category: { _id: "c", name: "Cat" },
    };

    mockedAxios.get
      .mockResolvedValueOnce({ data: { product: prodA } }) // product A
      .mockResolvedValueOnce({ data: { products: [] } })   // related A
      .mockResolvedValueOnce({ data: { product: prodB } }) // product B
      .mockResolvedValueOnce({ data: { products: [] } });  // related B

    const { rerender } = render(
      <MemoryRouter initialEntries={["/product/a"]}>
        <Routes>
          <Route path="/product/:slug" element={<ProductDetails />} />
        </Routes>
      </MemoryRouter>
    );

    await screen.findByText("Product Details");
    expect(mockedAxios.get).toHaveBeenCalledWith(
      "/api/v1/product/get-product/a"
    );

    rerender(
      <MemoryRouter initialEntries={["/product/b"]}>
        <Routes>
          <Route path="/product/:slug" element={<ProductDetails />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledWith(
        "/api/v1/product/get-product/b"
      );
    });
  });

  /**
   * Verifies: related-products API failure does not crash the page; product details
   * still render. (We don't assert on any toast/logs; just stability.)
   */
  test("handles related API failure gracefully", async () => {
    const product = {
      _id: "X",
      name: "X",
      description: "desc",
      price: 10,
      slug: "x",
      category: { _id: "c", name: "Cat" },
    };

    mockedAxios.get
      .mockResolvedValueOnce({ data: { product } }) // product ok
      .mockRejectedValueOnce(new Error("boom"));    // related fails

    renderWithSlug("/product/x");

    expect(await screen.findByText("Product Details")).toBeInTheDocument();
    expect(screen.getByText(/Name :/)).toHaveTextContent("Name : X");
  });

  /**
   * EXPECTED TO FAIL UNTIL FIXED IN SOURCE:
   * Verifies: a related product with missing description does not crash the component.
   * Current code does: p.description.substring(...) which will throw if description is undefined.
   * Patch idea: use (p.description ?? "").substring(0, 60).
   */
  test("is robust when a related product has no description (no crash)", async () => {
    const product = {
      _id: "P1",
      name: "Main",
      description: "main",
      price: 10,
      slug: "main",
      category: { _id: "c", name: "Cat" },
    };
    const related = [
      {
        _id: "R1",
        name: "Rel no desc",
        // description: undefined,
        price: 2,
        slug: "rel-no-desc",
      } as any,
    ];

    mockedAxios.get
      .mockResolvedValueOnce({ data: { product } })
      .mockResolvedValueOnce({ data: { products: related } });

    renderWithSlug("/product/main");

    // Page should still render and show the related product's name
    expect(await screen.findByText("Product Details")).toBeInTheDocument();
    expect(await screen.findByText("Rel no desc")).toBeInTheDocument();
  });

  /**
   * EXPECTED TO FAIL UNTIL FIXED IN SOURCE:
   * Verifies: if the product payload lacks _id or category._id, we do NOT call the related endpoint.
   * Current code unconditionally calls getSimilarProduct(data.product._id, data.product.category._id)
   * which will throw if product/category is missing. Patch by guarding before calling.
   */
  test("skips related call when product id/category id are missing", async () => {
    const product = {
      // _id missing
      name: "Broken",
      description: "no ids",
      price: 1,
      slug: "broken",
      // category missing
    } as any;

    mockedAxios.get.mockResolvedValueOnce({ data: { product } });

    // Silence console.log from catch blocks if any error occurs
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    renderWithSlug("/product/broken");

    // First call made for product fetch
    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledWith(
        "/api/v1/product/get-product/broken"
      );
    });

    // Ensure no second call to related endpoint
    const calledRelated = mockedAxios.get.mock.calls.some(
      (args: unknown[]) =>
        typeof args[0] === "string" &&
        (args[0] as string).includes("related-product")
    );
    expect(calledRelated).toBe(false);

    consoleSpy.mockRestore();
  });

  /**
   * Verifies: price formatting corner cases on main product (0 and large numbers) render without crashes.
   * NOTE: if price is undefined, toLocaleString will throw; this test keeps defined numeric prices.
   */
  test("formats price for zero and large values without crashing", async () => {
    const productZero = {
      _id: "Z",
      name: "Zero",
      description: "zero price",
      price: 0,
      slug: "zero",
      category: { _id: "c", name: "Cat" },
    };
    const related: any[] = [];

    mockedAxios.get
      .mockResolvedValueOnce({ data: { product: productZero } })
      .mockResolvedValueOnce({ data: { products: related } });

    const { unmount } = renderWithSlug("/product/zero");
    expect(await screen.findByText("Product Details")).toBeInTheDocument();
    expect(screen.getByText(/Price/)).toHaveTextContent("$0.00");
    unmount();

    // Rerender with a large price (fresh mount to avoid stacking trees)
    const productBig = { ...productZero, price: 1234567.89, name: "Big" };
    mockedAxios.get
      .mockResolvedValueOnce({ data: { product: productBig } })
      .mockResolvedValueOnce({ data: { products: related } });

    renderWithSlug("/product/zero"); // fresh render
    expect(await screen.findByText("Product Details")).toBeInTheDocument();
    expect(screen.getByText(/Price/)).toHaveTextContent("$1,234,567.89");
  });

  /**
   * Verifies: the "ADD TO CART" button text is present in the DOM (simple sanity check,
   * not asserting event handlers because it's not wired in this component).
   */
  test("renders the Add to Cart button text", async () => {
    const product = {
      _id: "prod123",
      name: "Test Product",
      description: "A very nice product",
      price: 10,
      slug: "test-product",
      category: { _id: "cat9", name: "Gadgets" },
    };

    mockedAxios.get
      .mockResolvedValueOnce({ data: { product } })
      .mockResolvedValueOnce({ data: { products: [] } });

    renderWithSlug("/product/test-product");

    expect(await screen.findByText("ADD TO CART")).toBeInTheDocument();
  });
});
