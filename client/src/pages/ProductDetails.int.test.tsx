import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import { MemoryRouter, Route, Routes } from "react-router-dom";
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

jest.mock("../components/Header", () => () => <div data-testid="hdr" />);
jest.mock("../components/Footer", () => () => <div data-testid="ftr" />);

const asyncOk = <T,>(value: T) =>
  new Promise<T>((res) => setTimeout(() => res(value), 0));

const asyncErr = (err: unknown) =>
  new Promise<never>((_res, rej) => setTimeout(() => rej(err), 0));

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/product/:slug" element={<ProductDetails />} />
        <Route path="/product" element={<ProductDetails />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("ProductDetails (integration-lite, behaviour-first)", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test("happy path: correct endpoints → renders product fields, USD formatting, image, related list", async () => {
    const main = {
      _id: "p-main",
      name: "Main Product",
      description: "Main product description",
      price: 199.99,
      slug: "main",
      category: { _id: "c-audio", name: "Audio" },
    };
    const rel = [
      {
        _id: "rel-1",
        name: "Rel 1",
        description: "Rel",
        price: 20,
        slug: "rel-1",
      },
    ];

    mockedAxios.get
      .mockImplementationOnce((url) => {
        expect(url).toBe("/api/v1/product/get-product/main");
        return asyncOk({ data: { product: main } });
      })
      .mockImplementationOnce((url) => {
        expect(url).toBe("/api/v1/product/related-product/p-main/c-audio");
        return asyncOk({ data: { products: rel } });
      });

    renderAt("/product/main");

    expect(
      await screen.findByRole("heading", { name: /Product Details/i })
    ).toBeInTheDocument();

    expect(
      await screen.findByText(/Name :\s*Main Product/i)
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/Description :\s*Main product description/i)
    ).toBeInTheDocument();
    expect(await screen.findByText(/\$199\.99/)).toBeInTheDocument();
    expect(await screen.findByText(/Category :\s*Audio/i)).toBeInTheDocument();

    expect(await screen.findByText("Rel 1")).toBeInTheDocument();
    expect(
      screen.queryByText(/No Similar Products found/i)
    ).not.toBeInTheDocument();

    const mainImg = screen.getByRole("img", { name: /Main Product/i });
    expect(mainImg).toHaveAttribute(
      "src",
      "/api/v1/product/product-photo/p-main"
    );
  });

  test("empty related: shows proper empty-state message", async () => {
    const main = {
      _id: "p-main",
      name: "Main",
      description: "d",
      price: 1,
      slug: "main",
      category: { _id: "c-audio", name: "Audio" },
    };

    mockedAxios.get
      .mockImplementationOnce(() => asyncOk({ data: { product: main } }))
      .mockImplementationOnce(() => asyncOk({ data: { products: [] } }));

    renderAt("/product/main");

    expect(
      await screen.findByRole("heading", { name: /Product Details/i })
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/No Similar Products found/i)
    ).toBeInTheDocument();
  });

  test("defensive: if product lacks _id or category._id → no related request; UI remains stable", async () => {
    const noIds = {
      name: "No IDs",
      description: "Missing identifiers",
      price: 10,
      slug: "no-ids",
      category: { name: "Unknown" },
    };

    mockedAxios.get.mockImplementationOnce(() =>
      asyncOk({ data: { product: noIds } })
    );

    renderAt("/product/no-ids");

    expect(await screen.findByText(/Name :\s*No IDs/i)).toBeInTheDocument();

    await waitFor(() => {
      const urls = mockedAxios.get.mock.calls.map((c) => c[0]);
      expect(urls).toEqual(["/api/v1/product/get-product/no-ids"]);
    });

    expect(screen.getByText(/No Similar Products found/i)).toBeInTheDocument();
  });

  test("error: when product request fails, component doesn’t crash; shows stable shell + empty-state", async () => {
    mockedAxios.get.mockImplementationOnce(() => asyncErr(new Error("404")));

    renderAt("/product/missing");

    expect(
      await screen.findByRole("heading", { name: /Product Details/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/No Similar Products found/i)).toBeInTheDocument();
    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    expect(mockedAxios.get).toHaveBeenCalledWith(
      "/api/v1/product/get-product/missing"
    );
  });

  test("navigation: clicking 'More Details' pushes a new slug and re-fetches", async () => {
    const main = {
      _id: "p-main",
      name: "Main",
      description: "d",
      price: 10,
      slug: "main",
      category: { _id: "c-audio", name: "Audio" },
    };
    const rels = [
      {
        _id: "rel-1",
        name: "Rel 1",
        description: "rel",
        price: 20,
        slug: "rel-1",
      },
    ];
    const relProduct = {
      _id: "rel-1",
      name: "Rel 1",
      description: "Rel 1 desc",
      price: 20,
      slug: "rel-1",
      category: { _id: "c-audio", name: "Audio" },
    };

    mockedAxios.get
      .mockImplementationOnce(() => asyncOk({ data: { product: main } }))
      .mockImplementationOnce(() => asyncOk({ data: { products: rels } }))
      .mockImplementationOnce((url) => {
        expect(url).toBe("/api/v1/product/get-product/rel-1");
        return asyncOk({ data: { product: relProduct } });
      })
      .mockImplementationOnce((url) => {
        expect(url).toBe("/api/v1/product/related-product/rel-1/c-audio");
        return asyncOk({ data: { products: [] } });
      });

    renderAt("/product/main");

    expect(await screen.findByText("Rel 1")).toBeInTheDocument();

    await act(async () => {
      await userEvent.click(
        await screen.findByRole("button", { name: /More Details/i })
      );
    });

    expect(await screen.findByText(/Name :\s*Rel 1/i)).toBeInTheDocument();
  });

  test("race safety: slow A response must not overwrite faster B (URL-keyed mocks + act on manual resolve)", async () => {
    let resolveA!: (v: any) => void;
    const slowA = new Promise((res) => (resolveA = res));

    mockedAxios.get.mockImplementation((url: string) => {
      if (url === "/api/v1/product/get-product/a") return slowA as any;
      if (url === "/api/v1/product/get-product/b") {
        return asyncOk({
          data: {
            product: {
              _id: "p-b",
              name: "B (fresh)",
              description: "New",
              price: 20,
              slug: "b",
              category: { _id: "c-b", name: "Audio" },
            },
          },
        });
      }
      if (url.startsWith("/api/v1/product/related-product/")) {
        return asyncOk({ data: { products: [] } });
      }
      throw new Error("Unexpected URL: " + url);
    });

    const { unmount } = render(
      <MemoryRouter initialEntries={["/product/a"]}>
        <Routes>
          <Route path="/product/:slug" element={<ProductDetails />} />
        </Routes>
      </MemoryRouter>
    );

    unmount();
    render(
      <MemoryRouter initialEntries={["/product/b"]}>
        <Routes>
          <Route path="/product/:slug" element={<ProductDetails />} />
        </Routes>
      </MemoryRouter>
    );

    await act(async () => {
      await resolveA({
        data: {
          product: {
            _id: "p-a",
            name: "A (stale)",
            description: "Old",
            price: 10,
            slug: "a",
            category: { _id: "c-a", name: "Audio" },
          },
        },
      });
    });

    expect(await screen.findByText(/B \(fresh\)/i)).toBeInTheDocument();
    expect(screen.queryByText(/A \(stale\)/i)).not.toBeInTheDocument();
  });

  test("odd payloads: non-array 'products' from related API should be treated as empty (no crash)", async () => {
    const main = {
      _id: "p-main",
      name: "Main",
      description: "d",
      price: 10,
      slug: "main",
      category: { _id: "c-audio", name: "Audio" },
    };

    mockedAxios.get
      .mockImplementationOnce(() => asyncOk({ data: { product: main } }))
      .mockImplementationOnce(() =>
        asyncOk({ data: { products: { bad: "shape" } } })
      );

    renderAt("/product/main");

    expect(
      await screen.findByRole("heading", { name: /Product Details/i })
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/No Similar Products found/i)
    ).toBeInTheDocument();
  });

  test("navigation guard: 'More Details' on related item with missing slug should not navigate", async () => {
    const main = {
      _id: "p-main",
      name: "Main",
      description: "d",
      price: 10,
      slug: "main",
      category: { _id: "c-audio", name: "Audio" },
    };
    const rels = [
      {
        _id: "rel-wo-slug",
        name: "Rel no slug",
        description: "rel",
        price: 20,
      } as any,
    ];

    mockedAxios.get
      .mockImplementationOnce(() => asyncOk({ data: { product: main } }))
      .mockImplementationOnce(() => asyncOk({ data: { products: rels } }));

    renderAt("/product/main");

    expect(await screen.findByText("Rel no slug")).toBeInTheDocument();

    await act(async () => {
      await userEvent.click(
        await screen.findByRole("button", { name: /More Details/i })
      );
    });

    expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    expect(await screen.findByText(/Name :\s*Main/i)).toBeInTheDocument();
  });

  test("re-entering the same route (same slug) via new history entry refetches due to location.key change", async () => {
    const main = {
      _id: "p-main",
      name: "Main",
      description: "d",
      price: 10,
      slug: "main",
      category: { _id: "c-audio", name: "Audio" },
    };

    mockedAxios.get
      .mockImplementationOnce(() => asyncOk({ data: { product: main } }))
      .mockImplementationOnce(() => asyncOk({ data: { products: [] } }));

    const first = render(
      <MemoryRouter
        initialEntries={[{ pathname: "/product/main", key: "k1" } as any]}
      >
        <Routes>
          <Route path="/product/:slug" element={<ProductDetails />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText(/Name :\s*Main/i)).toBeInTheDocument();

    mockedAxios.get
      .mockImplementationOnce(() => asyncOk({ data: { product: main } }))
      .mockImplementationOnce(() => asyncOk({ data: { products: [] } }));

    first.unmount();

    render(
      <MemoryRouter
        initialEntries={[{ pathname: "/product/main", key: "k2" } as any]}
      >
        <Routes>
          <Route path="/product/:slug" element={<ProductDetails />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText(/Name :\s*Main/i)).toBeInTheDocument();
    expect(mockedAxios.get).toHaveBeenCalledTimes(4);
  });

  test("accessibility fallback: when product has no name, image alt uses generic fallback (no crash)", async () => {
    const unnamed = {
      _id: "p-x",
      description: "d",
      price: 10,
      slug: "x",
      category: { _id: "c", name: "Cat" },
    } as any;

    mockedAxios.get
      .mockImplementationOnce(() => asyncOk({ data: { product: unnamed } }))
      .mockImplementationOnce(() => asyncOk({ data: { products: [] } }));

    renderAt("/product/x");

    expect(
      await screen.findByRole("img", { name: /Product image/i })
    ).toBeInTheDocument();
  });

  test("price formatting: zero and large values render correctly and consistently", async () => {
    const zero = {
      _id: "pz",
      name: "Zero",
      description: "d",
      price: 0,
      slug: "zero",
      category: { _id: "c", name: "Cat" },
    };
    mockedAxios.get
      .mockImplementationOnce(() => asyncOk({ data: { product: zero } }))
      .mockImplementationOnce(() => asyncOk({ data: { products: [] } }));

    const { unmount } = renderAt("/product/zero");
    expect(await screen.findByText(/\$0\.00/)).toBeInTheDocument();

    const big = {
      ...zero,
      name: "Big",
      price: 1234567.89,
      slug: "big",
      _id: "pbig",
    };
    mockedAxios.get
      .mockImplementationOnce(() => asyncOk({ data: { product: big } }))
      .mockImplementationOnce(() => asyncOk({ data: { products: [] } }));

    unmount();
    renderAt("/product/big");
    expect(await screen.findByText(/\$1,234,567\.89/)).toBeInTheDocument();
  });

  test("no slug route: does not fetch and shows stable empty-state shell", async () => {
    renderAt("/product");

    await waitFor(() => {
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    expect(
      await screen.findByRole("heading", { name: /Product Details/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/No Similar Products found/i)).toBeInTheDocument();
  });

  test("race safety (related): related result from stale slug must not render after navigating to a new slug", async () => {
    const prodA = {
      _id: "p-a",
      name: "A",
      description: "desc A",
      price: 10,
      slug: "a",
      category: { _id: "c-a", name: "Audio" },
    };
    const prodB = {
      _id: "p-b",
      name: "B",
      description: "desc B",
      price: 20,
      slug: "b",
      category: { _id: "c-b", name: "Audio" },
    };

    let resolveRelA!: (v: any) => void;
    const slowRelA = new Promise((res) => (resolveRelA = res));

    mockedAxios.get.mockImplementation((url: string) => {
      if (url === "/api/v1/product/get-product/a") {
        return Promise.resolve({ data: { product: prodA } });
      }
      if (url === "/api/v1/product/related-product/p-a/c-a") {
        return slowRelA as any;
      }
      if (url === "/api/v1/product/get-product/b") {
        return Promise.resolve({ data: { product: prodB } });
      }
      if (url === "/api/v1/product/related-product/p-b/c-b") {
        return Promise.resolve({
          data: {
            products: [
              {
                _id: "rel-b",
                name: "Rel B",
                description: "B",
                price: 1,
                slug: "rel-b",
              },
            ],
          },
        });
      }
      throw new Error("Unexpected URL: " + url);
    });

    const { unmount } = render(
      <MemoryRouter initialEntries={["/product/a"]}>
        <Routes>
          <Route path="/product/:slug" element={<ProductDetails />} />
        </Routes>
      </MemoryRouter>
    );

    unmount();
    render(
      <MemoryRouter initialEntries={["/product/b"]}>
        <Routes>
          <Route path="/product/:slug" element={<ProductDetails />} />
        </Routes>
      </MemoryRouter>
    );

    await act(async () => {
      await resolveRelA({
        data: {
          products: [
            {
              _id: "rel-a",
              name: "Rel A (stale)",
              description: "A",
              price: 1,
              slug: "rel-a",
            },
          ],
        },
      });
    });

    expect(await screen.findByText(/Name :\s*B/i)).toBeInTheDocument();
    expect(await screen.findByText("Rel B")).toBeInTheDocument();
    expect(screen.queryByText(/Rel A \(stale\)/i)).not.toBeInTheDocument();
  });
});
