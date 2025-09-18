import { act, renderHook } from "@testing-library/react";
import axios from "axios";
import useCategory from "./useCategory";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("useCategory", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should fetch and set categories on mount", async () => {
    const mockCategories = [{ name: "cat1" }, { name: "cat2" }];
    mockedAxios.get.mockResolvedValueOnce({
      data: { category: mockCategories },
    });

    const { result } = renderHook(() => useCategory());
    expect(result.current).toEqual([]); // Initial state

    // Wait for useEffect to run and state to update
    await act(async () => {});

    expect(mockedAxios.get).toHaveBeenCalledWith(
      "/api/v1/category/get-category"
    );
    expect(result.current).toEqual(mockCategories);
  });

  it("should handle errors and log them", async () => {
    const error = new Error("Network error");
    mockedAxios.get.mockRejectedValueOnce(error);
    const consoleSpy = jest.spyOn(console, "log").mockImplementation();
    const { result } = renderHook(() => useCategory());

    // Wait for useEffect to run and state to update
    await act(async () => {});

    expect(consoleSpy).toHaveBeenCalledWith(error);
    expect(result.current).toEqual([]);
    consoleSpy.mockRestore();
  });
});
