import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import axios from "axios";
import React from "react";
import { error as toastError, success as toastSuccess } from "react-hot-toast";
import CreateCategory from "./CreateCategory";

/* ===================== Mocks ===================== */

// Axios
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
const mockedAxios = axios as unknown as {
  get: jest.Mock;
  post: jest.Mock;
  put: jest.Mock;
  delete: jest.Mock;
};

// react-hot-toast
jest.mock("react-hot-toast", () => {
  const success = jest.fn();
  const error = jest.fn();
  return { success, error };
});

// Layout/AdminMenu pass-through
jest.mock(
  "../../components/Layout",
  () =>
    ({ children }: { children: React.ReactNode }) => (
      <div data-testid="layout">{children}</div>
    )
);
jest.mock("../../components/AdminMenu", () => () => (
  <div data-testid="admin-menu">AdminMenu</div>
));

// CategoryForm mock
jest.mock(
  "../../components/Form/CategoryForm",
  () =>
    ({
      value,
      setValue,
      handleSubmit,
      "data-testid": testId,
    }: {
      value: string;
      setValue: (v: string) => void;
      handleSubmit: (e: React.FormEvent) => void;
      "data-testid"?: string;
    }) => (
      <form onSubmit={handleSubmit} data-testid={testId ?? "category-form"}>
        <input
          data-testid={(testId ?? "category-form") + "-input"}
          value={value}
          onChange={(e) => setValue?.(e.target.value)}
          placeholder="Category name"
        />
        <button type="submit">Submit</button>
      </form>
    )
);

/**
 * AntD Modal mock — emulate AntD v5 (uses `open`, not `visible`).
 * If the source passes `visible`, this mock will NOT render content → tests will fail,
 * surfacing the real bug until the source is updated to use `open`.
 */
jest.mock("antd", () => {
  const Modal = ({
    open,
    onCancel,
    children,
  }: {
    open?: boolean;
    onCancel?: () => void;
    children?: React.ReactNode;
  }) => (
    <div data-testid="modal">
      {open ? (
        <div data-testid="modal-content">
          <button onClick={onCancel} data-testid="modal-close">
            X
          </button>
          {children}
        </div>
      ) : null}
    </div>
  );
  return { Modal };
});

/* ===================== Helpers ===================== */

function renderPage() {
  return render(<CreateCategory />);
}

let consoleLogSpy: jest.SpyInstance;

beforeEach(() => {
  jest.resetAllMocks();
  // silence console.log noise from mocked rejections in these tests
  consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  consoleLogSpy?.mockRestore();
});

/* ===================== Tests ===================== */

describe("Admin/CreateCategory (unit) — tests uncover bugs first", () => {
  test("loads categories on mount and renders table rows (no React key warnings)", async () => {
    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        success: true,
        category: [
          { _id: "a1", name: "Phones" },
          { _id: "a2", name: "Laptops" },
        ],
      },
    });

    renderPage();

    await waitFor(() =>
      expect(mockedAxios.get).toHaveBeenCalledWith(
        "/api/v1/category/get-category"
      )
    );

    expect(await screen.findByText("Phones")).toBeInTheDocument();
    expect(await screen.findByText("Laptops")).toBeInTheDocument();

    // Assert there was NO "unique key" warning
    const hadKeyWarning = consoleErrorSpy.mock.calls.some((call) =>
      String(call[0]).includes('unique "key" prop')
    );
    consoleErrorSpy.mockRestore();
    expect(hadKeyWarning).toBe(false);
  });

  test("getAllCategory rejected → shows correctly spelled toast", async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error("boom"));

    renderPage();

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith(
        "Something went wrong in getting category"
      )
    );
  });

  test("getAllCategory returns success:false → shows error toast and does not render rows", async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        success: false,
        message: "API down",
        category: [{ _id: "x", name: "ShouldNotRender" }],
      },
    });

    renderPage();

    await waitFor(() => expect(toastError).toHaveBeenCalledWith("API down"));
    expect(screen.queryByText("ShouldNotRender")).not.toBeInTheDocument();
  });

  test("create category success → posts, success toast (uses name), refetches list", async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { success: true, category: [] },
    });
    mockedAxios.post.mockResolvedValueOnce({ data: { success: true } });
    mockedAxios.get.mockResolvedValueOnce({
      data: { success: true, category: [{ _id: "n1", name: "NewCat" }] },
    });

    renderPage();

    const input = await screen.findByPlaceholderText("Category name");
    fireEvent.change(input, { target: { value: "NewCat" } });

    fireEvent.submit(screen.getByTestId("category-form"));

    await waitFor(() =>
      expect(mockedAxios.post).toHaveBeenCalledWith(
        "/api/v1/category/create-category",
        { name: "NewCat" }
      )
    );

    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith("NewCat is created");
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });

    // Wait for the re-fetched row to render
    expect(await screen.findByText("NewCat")).toBeInTheDocument();
  });

  test("create category API returns success:false → shows error toast with API message", async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { success: true, category: [] },
    });
    mockedAxios.post.mockResolvedValueOnce({
      data: { success: false, message: "Duplicate" },
    });

    renderPage();

    fireEvent.change(await screen.findByPlaceholderText("Category name"), {
      target: { value: "Phones" },
    });
    fireEvent.submit(screen.getByTestId("category-form"));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("Duplicate");
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });
  });

  test("create category rejected → shows correctly spelled toast", async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { success: true, category: [] },
    });
    mockedAxios.post.mockRejectedValueOnce(new Error("net"));

    renderPage();

    fireEvent.change(await screen.findByPlaceholderText("Category name"), {
      target: { value: "X" },
    });
    fireEvent.submit(screen.getByTestId("category-form"));

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith(
        "Something went wrong in input form"
      )
    );
  });

  test("click Edit opens modal (AntD v5 `open` prop), update success closes modal, toasts, refetches", async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { success: true, category: [{ _id: "a1", name: "Phones" }] },
    });
    mockedAxios.put.mockResolvedValueOnce({ data: { success: true } });
    mockedAxios.get.mockResolvedValueOnce({
      data: { success: true, category: [{ _id: "a1", name: "Gadgets" }] },
    });

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Edit" }));

    // Modal content must be visible (fails if source uses `visible` prop instead of `open`)
    const modal = await screen.findByTestId("modal-content");
    const modalInput = within(modal).getByTestId(
      "category-form-input"
    ) as HTMLInputElement;
    expect(modalInput.value).toBe("Phones");

    fireEvent.change(modalInput, { target: { value: "Gadgets" } });
    fireEvent.submit(within(modal).getByTestId("category-form"));

    await waitFor(() =>
      expect(mockedAxios.put).toHaveBeenCalledWith(
        "/api/v1/category/update-category/a1",
        { name: "Gadgets" }
      )
    );

    await waitFor(() =>
      expect(toastSuccess).toHaveBeenCalledWith("Gadgets is updated")
    );
    await waitFor(() =>
      expect(screen.queryByTestId("modal-content")).not.toBeInTheDocument()
    );
    expect(screen.getByText("Gadgets")).toBeInTheDocument();
  });

  test("update API returns success:false → shows error toast", async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { success: true, category: [{ _id: "a1", name: "Phones" }] },
    });
    mockedAxios.put.mockResolvedValueOnce({
      data: { success: false, message: "No permission" },
    });

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Edit" }));
    const modal = await screen.findByTestId("modal-content");
    const modalInput = within(modal).getByTestId(
      "category-form-input"
    ) as HTMLInputElement;

    fireEvent.change(modalInput, { target: { value: "Gadgets" } });
    fireEvent.submit(within(modal).getByTestId("category-form"));

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith("No permission")
    );
  });

  test("update rejected → shows correctly spelled toast", async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { success: true, category: [{ _id: "a1", name: "Phones" }] },
    });
    mockedAxios.put.mockRejectedValueOnce(new Error("net"));

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Edit" }));
    const modal = await screen.findByTestId("modal-content");
    const modalInput = within(modal).getByTestId(
      "category-form-input"
    ) as HTMLInputElement;

    fireEvent.change(modalInput, { target: { value: "Gadgets" } });
    fireEvent.submit(within(modal).getByTestId("category-form"));

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith("Something went wrong")
    );
  });

  test("delete success → toasts and refetches", async () => {
    mockedAxios.get
      .mockResolvedValueOnce({
        data: { success: true, category: [{ _id: "a1", name: "Phones" }] },
      })
      .mockResolvedValueOnce({ data: { success: true, category: [] } });
    mockedAxios.delete.mockResolvedValueOnce({ data: { success: true } });

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Delete" }));

    await waitFor(() =>
      expect(mockedAxios.delete).toHaveBeenCalledWith(
        "/api/v1/category/delete-category/a1"
      )
    );

    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith("category is deleted");
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });

    // Wait for the row to be removed after refetch
    await waitFor(() =>
      expect(screen.queryByText("Phones")).not.toBeInTheDocument()
    );
  });

  test("delete API returns success:false → shows error toast", async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { success: true, category: [{ _id: "a1", name: "Phones" }] },
    });
    mockedAxios.delete.mockResolvedValueOnce({
      data: { success: false, message: "Protected" },
    });

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Delete" }));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith("Protected"));
  });

  test("delete rejected → shows correctly spelled toast", async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { success: true, category: [{ _id: "a1", name: "Phones" }] },
    });
    mockedAxios.delete.mockRejectedValueOnce(new Error("net"));

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Delete" }));

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith("Something went wrong")
    );
  });
});
