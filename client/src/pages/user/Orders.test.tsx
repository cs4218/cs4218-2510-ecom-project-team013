import "@testing-library/jest-dom/extend-expect";
import { render, screen, waitFor } from "@testing-library/react";
import axios from "axios";
import { MemoryRouter } from "react-router-dom";
import { useAuth } from "../../context/auth";
import Orders, { type OrderRowData } from "./Orders";

// Mock dependencies
jest.mock("axios");
jest.mock("../../context/auth", () => ({
  useAuth: jest.fn(() => [{ token: "mockToken" }]),
}));
jest.mock(
  "../../components/Layout",
  () =>
    ({ children }: { children: React.ReactNode }) => <div>{children}</div>
);
jest.mock("../../components/UserMenu", () => () => <div>UserMenu</div>);

const mockUseAuth = useAuth as jest.Mock;

const mockOrders: ReadonlyArray<OrderRowData> = [
  {
    _id: "order1",
    status: "Delivered",
    buyer: { name: "Alice" },
    createAt: "2024-06-01T12:00:00Z",
    payment: { success: true },
    products: [
      {
        _id: "prod1",
        name: "Product 1",
        description: "Description for product 1",
        price: 100,
      },
      {
        _id: "prod2",
        name: "Product 2",
        description: "Description for product 2",
        price: 200,
      },
    ],
  },
];

describe("Orders Page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders orders when fetched", async () => {
    (axios.get as jest.Mock).mockResolvedValueOnce({ data: mockOrders });

    render(
      <MemoryRouter>
        <Orders />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("All Orders")).toBeInTheDocument();
      expect(screen.getByText("Delivered")).toBeInTheDocument();
      expect(screen.getByText("Alice")).toBeInTheDocument();
      expect(screen.getByText("Success")).toBeInTheDocument();
      expect(screen.getByText("Product 1")).toBeInTheDocument();
      expect(screen.getByText("Product 2")).toBeInTheDocument();
      expect(screen.getAllByRole("img")).toHaveLength(2);
    });
  });

  it("shows correct quantity of products", async () => {
    (axios.get as jest.Mock).mockResolvedValueOnce({ data: mockOrders });

    render(
      <MemoryRouter>
        <Orders />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("2")).toBeInTheDocument();
    });
  });

  it("renders UserMenu", async () => {
    (axios.get as jest.Mock).mockResolvedValueOnce({ data: mockOrders });

    render(
      <MemoryRouter>
        <Orders />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("UserMenu")).toBeInTheDocument();
    });
  });

  it("handles empty orders", async () => {
    (axios.get as jest.Mock).mockResolvedValueOnce({ data: [] });

    render(
      <MemoryRouter>
        <Orders />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("All Orders")).toBeInTheDocument();
    });
  });

  it("does not fetch orders if no token", async () => {
    (axios.get as jest.Mock).mockResolvedValueOnce({ data: mockOrders });
    mockUseAuth.mockReturnValue([{}]);

    render(
      <MemoryRouter>
        <Orders />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(axios.get).not.toHaveBeenCalled();
    });
  });
});
