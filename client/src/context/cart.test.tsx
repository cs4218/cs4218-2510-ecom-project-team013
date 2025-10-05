import { act, render } from "@testing-library/react";
import { CartProvider, useCart } from "./cart";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    clear: () => {
      store = {};
    },
    removeItem: (key: string) => {
      delete store[key];
    },
  };
})();
(window as any).localStorage = localStorageMock;

const sampleProduct = {
  _id: "p1",
  name: "Test Product",
  price: 10,
} as any;

function TestComponent() {
  const [cart, setCart] = useCart();
  return (
    <div>
      <span data-testid="cart-length">{cart.length}</span>
      <button
        onClick={() => setCart((prev) => [...prev, sampleProduct])}
        data-testid="add-btn"
      >
        Add
      </button>
    </div>
  );
}

describe("CartProvider and useCart", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test("initializes cart from localStorage", () => {
    window.localStorage.setItem("cart", JSON.stringify([sampleProduct]));
    let cartLength = 0;
    function ReadCart() {
      const [cart] = useCart();
      cartLength = cart.length;
      return null;
    }
    render(
      <CartProvider>
        <ReadCart />
      </CartProvider>
    );
    expect(cartLength).toBe(1);
  });

  test("cart is empty if localStorage is empty", () => {
    let cartLength = 1;
    function ReadCart() {
      const [cart] = useCart();
      cartLength = cart.length;
      return null;
    }
    render(
      <CartProvider>
        <ReadCart />
      </CartProvider>
    );
    expect(cartLength).toBe(0);
  });

  test("can add item to cart using setCart", () => {
    const { getByTestId } = render(
      <CartProvider>
        <TestComponent />
      </CartProvider>
    );
    expect(getByTestId("cart-length").textContent).toBe("0");
    act(() => {
      getByTestId("add-btn").click();
    });
    expect(getByTestId("cart-length").textContent).toBe("1");
  });

  test("throws error if useCart is used outside provider", () => {
    function BadComponent() {
      useCart();
      return null;
    }
    expect(() => render(<BadComponent />)).toThrow(
      "useCart must be used within a CartProvider"
    );
  });
});
