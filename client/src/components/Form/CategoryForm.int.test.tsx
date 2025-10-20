import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Toaster } from "react-hot-toast";
import api from "../../api";
import CreateCategory from "../../pages/admin/CreateCategory";

// Setup Mock API
jest.mock("../../api", () => ({
  category: {
    createCategory: jest.fn(),
    getAllCategories: jest.fn(),
    updateCategory: jest.fn(),
    deleteCategory: jest.fn(),
  },
}));

// Setup Mock Components
jest.mock("../../components/Layout", () => ({ children }: any) => (
  <div data-testid="layout">{children}</div>
));

jest.mock("../../components/AdminMenu", () => () => (
  <div>Mocked AdminMenu</div>
));

describe("CreateCategory integration test ", () => {
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

  test("shows success toast when category is created", async () => {
    (api.category.getAllCategories as jest.Mock)
      .mockResolvedValueOnce({ data: { success: true, category: [] } })
      .mockResolvedValueOnce({ data: { success: true, category: [] } });

    (api.category.createCategory as jest.Mock).mockResolvedValueOnce({
      data: { success: true },
    });

    render(
      <>
        <CreateCategory />
        <Toaster />
      </>
    );

    const input = await screen.findByTestId("category-input");
    fireEvent.change(input, { target: { value: "New Category" } });
    const button = screen.getByTestId("submit-button");
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("New Category is created")).toBeInTheDocument();
    });
  });

  test("shows error toast when creation fails", async () => {
    (api.category.getAllCategories as jest.Mock).mockResolvedValueOnce({
      data: { success: true, category: [] },
    });

    (api.category.createCategory as jest.Mock).mockResolvedValueOnce({
      data: { success: false, message: "Failed to create category" },
    });

    render(
      <>
        <CreateCategory />
        <Toaster />
      </>
    );

    const input = await screen.findByTestId("category-input");
    fireEvent.change(input, { target: { value: "Bad Category" } });
    const button = screen.getByTestId("submit-button");
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("Failed to create category")).toBeInTheDocument();
    });
  });
});
