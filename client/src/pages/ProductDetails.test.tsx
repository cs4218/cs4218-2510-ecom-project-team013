import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import axios from "axios";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import ProductDetails from "./ProductDetails";

jest.mock("axios", () => {
  const mock = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    create: () => mock,
    defaults: { headers: { common: {} } },
  };
  return mock;
});

const mockedAxios = axios as unknown as jest.Mocked<typeof axios>;

// Mock Layout to a simple passthrough so we don't test app shell
jest.mock(
  "../components/Layout",
  () =>
    ({ children }: { children: React.ReactNode }) => (
      <div data-testid="layout">{children}</div>
    )
);

jest.mock("react-router-dom", () => {
  const mockNavigate = jest.fn().mockImplementation(() => {});
  return {
    ...jest.requireActual("react-router-dom"),
    useNavigate: () => mockNavigate,
  };
});
const mockNavigate = useNavigate();

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
    jest.resetAllMocks();
  });

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

    await act(async () => {
      renderWithSlug("/product/test-product");
    });

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

    expect(await screen.findByText("Product Details")).toBeInTheDocument();
    expect(screen.getByText(/Name :/)).toHaveTextContent("Name : Test Product");
    expect(screen.getByText(/Description :/)).toHaveTextContent(
      "Description : A very nice product"
    );
    expect(screen.getByText(/Price/)).toHaveTextContent("$123.45");
    expect(screen.getByText(/Category :/)).toHaveTextContent(
      "Category : Gadgets"
    );

    const mainImg = screen.getByRole("img", { name: /Test Product/i });
    expect(mainImg).toHaveAttribute(
      "src",
      `/api/v1/product/product-photo/${product._id}`
    );
  });

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
      .mockResolvedValueOnce({ data: { product } })
      .mockResolvedValueOnce({ data: { products: [] } });

    renderWithSlug("/product/solo");

    expect(
      await screen.findByText(/No Similar Products found/i)
    ).toBeInTheDocument();
  });

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
    await act(async () => {
      fireEvent.click(btn);
    });
    expect(mockNavigate).toHaveBeenCalledWith("/product/rel-a");
  });

  test("does not fetch when slug is missing", async () => {
    render(
      <MemoryRouter initialEntries={["/product"]}>
        <Routes>
          <Route path="/product" element={<ProductDetails />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });
  });

  test("handles product API failure without crashing and skips related", async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error("Network error"));

    renderWithSlug("/product/bad-slug");

    expect(await screen.findByText("Product Details")).toBeInTheDocument();

    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    expect(mockedAxios.get).toHaveBeenCalledWith(
      "/api/v1/product/get-product/bad-slug"
    );
  });

  /**
   * UPDATED: do a clean unmount + fresh render for the second slug to avoid router rerender edge-cases
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
      .mockResolvedValueOnce({ data: { products: [] } }) // related A
      .mockResolvedValueOnce({ data: { product: prodB } }) // product B
      .mockResolvedValueOnce({ data: { products: [] } }); // related B

    const { unmount } = render(
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

    // Clean unmount then render with the new slug fresh
    unmount();

    render(
      <MemoryRouter initialEntries={["/product/b"]}>
        <Routes>
          <Route path="/product/:slug" element={<ProductDetails />} />
        </Routes>
      </MemoryRouter>
    );

    await screen.findByText("Product Details");
    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledWith(
        "/api/v1/product/get-product/b"
      );
    });
  });

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
      .mockRejectedValueOnce(new Error("boom")); // related fails

    renderWithSlug("/product/x");

    expect(await screen.findByText("Product Details")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/Name :/)).toHaveTextContent("Name : X");
    });
  });

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
        // description intentionally missing
        price: 2,
        slug: "rel-no-desc",
      } as any,
    ];

    mockedAxios.get
      .mockResolvedValueOnce({ data: { product } })
      .mockResolvedValueOnce({ data: { products: related } });

    renderWithSlug("/product/main");

    expect(await screen.findByText("Product Details")).toBeInTheDocument();
    expect(await screen.findByText("Rel no desc")).toBeInTheDocument();
  });

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

    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    renderWithSlug("/product/broken");

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledWith(
        "/api/v1/product/get-product/broken"
      );
    });

    const calledRelated = mockedAxios.get.mock.calls.some(
      (args: unknown[]) =>
        typeof args[0] === "string" &&
        (args[0] as string).includes("related-product")
    );
    expect(calledRelated).toBe(false);

    consoleSpy.mockRestore();
  });

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

    // ⭐ Wait for price text to update after async fetch
    await waitFor(() => {
      expect(screen.getByText(/Price/)).toHaveTextContent("$0.00");
    });

    unmount();

    // Rerender with a large price (fresh mount to avoid stacking trees)
    const productBig = { ...productZero, price: 1234567.89, name: "Big" };
    mockedAxios.get
      .mockResolvedValueOnce({ data: { product: productBig } })
      .mockResolvedValueOnce({ data: { products: related } });

    renderWithSlug("/product/zero");
    expect(await screen.findByText("Product Details")).toBeInTheDocument();

    // ⭐ Wait for the large formatted price too
    await waitFor(() => {
      expect(screen.getByText(/Price/)).toHaveTextContent("$1,234,567.89");
    });
  });

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

  test("renders multiple related cards with formatted prices", async () => {
    const product = {
      _id: "p",
      name: "Main",
      description: "d",
      price: 1,
      slug: "main",
      category: { _id: "c", name: "Cat" },
    };
    const related = [
      { _id: "r1", name: "A", description: "desc A", price: 12.3, slug: "a" },
      {
        _id: "r2",
        name: "B",
        description: "desc B",
        price: 4567.89,
        slug: "b",
      },
    ];

    mockedAxios.get
      .mockResolvedValueOnce({ data: { product } })
      .mockResolvedValueOnce({ data: { products: related } });

    renderWithSlug("/product/main");

    expect(await screen.findByText("A")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();

    const priceTexts = screen.getAllByText(/\$/).map((n) => n.textContent);
    expect(priceTexts).toEqual(expect.arrayContaining(["$12.30", "$4,567.89"]));
  });
});
