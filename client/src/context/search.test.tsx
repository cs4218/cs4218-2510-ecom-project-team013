import { render, screen } from "@testing-library/react";
import { act } from "react-dom/test-utils";
import { SearchProvider, useSearch } from "./search";

function TestComponent() {
  const [searchValue, setSearchValue] = useSearch();
  return (
    <div>
      <span data-testid="keyword">{searchValue.keyword}</span>
      <span data-testid="results">{searchValue.results.length}</span>
      <button
        onClick={() => setSearchValue({ keyword: "test", results: [1, 2, 3] })}
      >
        Update
      </button>
    </div>
  );
}

describe("SearchContext", () => {
  test("provides default values", () => {
    render(
      <SearchProvider>
        <TestComponent />
      </SearchProvider>
    );
    expect(screen.getByTestId("keyword").textContent).toBe("");
    expect(screen.getByTestId("results").textContent).toBe("0");
  });

  test("updates context value", async () => {
    render(
      <SearchProvider>
        <TestComponent />
      </SearchProvider>
    );
    const button = screen.getByText("Update");
    await act(async () => {
      button.click();
    });
    expect(screen.getByTestId("keyword").textContent).toBe("test");
    expect(screen.getByTestId("results").textContent).toBe("3");
  });

  test("throws error if useSearch is used outside provider", () => {
    // Suppress error output for this test
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    const BrokenConsumer = () => {
      useSearch();
      return null;
    };
    expect(() => render(<BrokenConsumer />)).toThrow(
      "useSearch must be used within a SearchProvider"
    );
    spy.mockRestore();
  });
});
