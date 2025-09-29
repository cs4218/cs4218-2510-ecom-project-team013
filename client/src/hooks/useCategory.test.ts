import { renderHook, waitFor } from "@testing-library/react";
import axios from "axios";
import useCategory from "./useCategory";

/* ===================== Mocks ===================== */

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
const mockedAxios = axios as unknown as { get: jest.Mock };

/* ===================== Setup ===================== */

beforeEach(() => {
  jest.resetAllMocks();
});

/* ===================== Tests ===================== */

describe("hooks/useCategory (unit) — bug-hunting tests", () => {
  test("calls API on mount, then updates categories state", async () => {
    const fake = [
      { _id: "c1", name: "Phones" },
      { _id: "c2", name: "Books" },
    ];
    mockedAxios.get.mockResolvedValueOnce({
      data: { success: true, category: fake },
    });

    const { result } = renderHook(() => useCategory());

    // initial state
    expect(result.current).toEqual([]);

    // assert API call (single assertion inside waitFor)
    await waitFor(() =>
      expect(mockedAxios.get).toHaveBeenCalledWith(
        "/api/v1/category/get-category"
      )
    );

    // assert final state separately (single assertion inside waitFor)
    await waitFor(() => expect(result.current).toEqual(fake));
  });

  test("API rejects → logs error and keeps state as an empty array", async () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    mockedAxios.get.mockRejectedValueOnce(new Error("network"));

    const { result } = renderHook(() => useCategory());

    await waitFor(() =>
      expect(mockedAxios.get).toHaveBeenCalledWith(
        "/api/v1/category/get-category"
      )
    );

    expect(result.current).toEqual([]);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  test("API resolves without `category` field → should keep [] (robustness)", async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { success: true } });

    const { result } = renderHook(() => useCategory());

    await waitFor(() =>
      expect(mockedAxios.get).toHaveBeenCalledWith(
        "/api/v1/category/get-category"
      )
    );

    // Wait explicitly for the post-fetch state so we don't pass accidentally
    await waitFor(() => expect(Array.isArray(result.current)).toBe(true));
    expect(result.current).toEqual([]);
  });

  // ---------- New tests that will likely FAIL with current implementation ----------

  test("category is NOT an array (e.g., object) → should keep []", async () => {
    // Current hook sets categories = data?.category (object) → consumers may crash on .map
    mockedAxios.get.mockResolvedValueOnce({
      data: { success: true, category: { _id: "oops", name: "NotAnArray" } },
    });

    const { result } = renderHook(() => useCategory());

    await waitFor(() =>
      expect(mockedAxios.get).toHaveBeenCalledWith(
        "/api/v1/category/get-category"
      )
    );

    // Expect robust behavior: keep []
    await waitFor(() => expect(result.current).toEqual([]));
  });

  test("success:false even with category returned → should keep []", async () => {
    // Endpoint contract elsewhere uses success flag; hook should honor it
    mockedAxios.get.mockResolvedValueOnce({
      data: { success: false, category: [{ _id: "c1", name: "ShouldIgnore" }] },
    });

    const { result } = renderHook(() => useCategory());

    await waitFor(() =>
      expect(mockedAxios.get).toHaveBeenCalledWith(
        "/api/v1/category/get-category"
      )
    );

    await waitFor(() => expect(result.current).toEqual([]));
  });

  test("unmount before request resolves → should NOT set state after unmount (no React warning)", async () => {
    // Create a controllable promise
    let resolveFn: (v: any) => void;
    const pending = new Promise((res) => {
      resolveFn = res;
    });

    // React warns on setState after unmount via console.error; we assert that NO such warning happens
    const consoleErr = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    mockedAxios.get.mockReturnValueOnce(pending);

    const { unmount } = renderHook(() => useCategory());

    // Ensure request was fired
    await waitFor(() =>
      expect(mockedAxios.get).toHaveBeenCalledWith(
        "/api/v1/category/get-category"
      )
    );

    // Unmount before the promise resolves
    unmount();

    // Now resolve the request (it returns a successful payload)
    resolveFn!({
      data: { success: true, category: [{ _id: "c1", name: "Late" }] },
    });

    // Give React a tick to process any setState; assert there was NO unmounted-setState warning
    // (single assertion inside waitFor)
    await waitFor(() => expect(consoleErr).not.toHaveBeenCalled());

    consoleErr.mockRestore();
  });
});
