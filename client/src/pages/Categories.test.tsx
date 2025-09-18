import "@testing-library/jest-dom/extend-expect";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import useCategory from "../hooks/useCategory";
import Categories from "./Categories";

// Mock dependencies
jest.mock(
  "../components/Layout",
  () =>
    ({ children }: { children: React.ReactNode }) => <div>{children}</div>
);
jest.mock("../hooks/useCategory");
const mockUseCategory = useCategory as jest.Mock;

const mockCategories = [
  { _id: "cat1", name: "Electronics", slug: "electronics" },
  { _id: "cat2", name: "Books", slug: "books" },
];

describe("Categories Page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders all categories", () => {
    mockUseCategory.mockReturnValue(mockCategories);
    render(
      <MemoryRouter>
        <Categories />
      </MemoryRouter>
    );

    expect(screen.getByText("Electronics")).toBeInTheDocument();
    expect(screen.getByText("Books")).toBeInTheDocument();
  });

  it("renders category links with correct href", () => {
    mockUseCategory.mockReturnValue(mockCategories);
    render(
      <MemoryRouter>
        <Categories />
      </MemoryRouter>
    );

    expect(screen.getByText("Electronics").closest("a")).toHaveAttribute(
      "href",
      "/category/electronics"
    );
    expect(screen.getByText("Books").closest("a")).toHaveAttribute(
      "href",
      "/category/books"
    );
  });

  it("renders correct number of category buttons", () => {
    mockUseCategory.mockReturnValue(mockCategories);
    render(
      <MemoryRouter>
        <Categories />
      </MemoryRouter>
    );

    expect(screen.getAllByRole("link")).toHaveLength(mockCategories.length);
  });

  it("renders nothing if no categories", () => {
    mockUseCategory.mockReturnValue([]);
    render(
      <MemoryRouter>
        <Categories />
      </MemoryRouter>
    );

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
