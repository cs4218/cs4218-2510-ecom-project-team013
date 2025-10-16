import { render, screen, waitFor, within } from "@testing-library/react";
import * as userEventLib from "@testing-library/user-event";
import axios from "axios";
import React from "react";
import { error as toastError, success as toastSuccess } from "react-hot-toast";
import CreateCategory from "./CreateCategory";

function getUser() {
  const anyLib = userEventLib as any;
  const ue = anyLib.default ?? anyLib; // ESM/CJS compat
  return typeof ue.setup === "function" ? ue.setup() : ue;
}

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

jest.mock("react-hot-toast", () => {
  const success = jest.fn();
  const error = jest.fn();
  return { success, error };
});

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

const renderPage = () => render(<CreateCategory />);

let consoleErrorSpy: jest.SpyInstance;
beforeAll(() => {
  consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
});
afterAll(() => {
  consoleErrorSpy.mockRestore();
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Admin/CreateCategory (integration-lite)", () => {
  test("loads categories on mount and renders rows", async () => {
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

    expect(await screen.findByText("Phones")).toBeInTheDocument();
    expect(await screen.findByText("Laptops")).toBeInTheDocument();
  });

  test("getAllCategory rejected → shows toast and keeps page usable", async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error("boom"));

    renderPage();

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith(
        "Something went wrong in getting category"
      )
    );
    expect(screen.getByTestId("layout")).toBeInTheDocument();
    expect(screen.getByTestId("admin-menu")).toBeInTheDocument();
  });

  test("getAllCategory success:false → uses API message and shows no rows", async () => {
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

  test("create → success: posts, success toast with name, refetch renders new row", async () => {
    const user = getUser();
    mockedAxios.get.mockResolvedValueOnce({
      data: { success: true, category: [] },
    });
    mockedAxios.post.mockResolvedValueOnce({ data: { success: true } });
    mockedAxios.get.mockResolvedValueOnce({
      data: { success: true, category: [{ _id: "n1", name: "NewCat" }] },
    });

    renderPage();

    const input = await screen.findByTestId("category-input");
    await user.clear(input);
    await user.type(input, "NewCat");
    await user.click(screen.getByTestId("submit-button"));

    await waitFor(() =>
      expect(mockedAxios.post).toHaveBeenCalledWith(
        "/api/v1/category/create-category",
        { name: "NewCat" }
      )
    );
    await waitFor(() =>
      expect(toastSuccess).toHaveBeenCalledWith("NewCat is created")
    );
    expect(await screen.findByText("NewCat")).toBeInTheDocument();
  });

  test("create → success:false: uses API message, does not refetch", async () => {
    const user = getUser();
    mockedAxios.get.mockResolvedValueOnce({
      data: { success: true, category: [] },
    });
    mockedAxios.post.mockResolvedValueOnce({
      data: { success: false, message: "Duplicate" },
    });

    renderPage();

    const input = await screen.findByTestId("category-input");
    await user.type(input, "Phones");
    await user.click(screen.getByTestId("submit-button"));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith("Duplicate"));
    // only initial GET (no refetch)
    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
  });

  test("create → rejected: shows spelled toast", async () => {
    const user = getUser();
    mockedAxios.get.mockResolvedValueOnce({
      data: { success: true, category: [] },
    });
    mockedAxios.post.mockRejectedValueOnce(new Error("net"));

    renderPage();

    const input = await screen.findByTestId("category-input");
    await user.type(input, "X");
    await user.click(screen.getByTestId("submit-button"));

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith(
        "Something went wrong in input form"
      )
    );
  });

  test("update (Edit flow) → success: closes modal, toasts, refetches, renders new name", async () => {
    const user = getUser();
    mockedAxios.get.mockResolvedValueOnce({
      data: { success: true, category: [{ _id: "a1", name: "Phones" }] },
    });
    mockedAxios.put.mockResolvedValueOnce({ data: { success: true } });
    mockedAxios.get.mockResolvedValueOnce({
      data: { success: true, category: [{ _id: "a1", name: "Gadgets" }] },
    });

    renderPage();

    await user.click(await screen.findByRole("button", { name: "Edit" }));
    const modal = await screen.findByTestId("modal-content");
    const modalInput = within(modal).getByTestId(
      "category-input"
    ) as HTMLInputElement;

    expect(modalInput.value).toBe("Phones");
    await user.clear(modalInput);
    await user.type(modalInput, "Gadgets");
    await user.click(within(modal).getByTestId("submit-button"));

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

  test("update → success:false: shows API message, modal remains open", async () => {
    const user = getUser();
    mockedAxios.get.mockResolvedValueOnce({
      data: { success: true, category: [{ _id: "a1", name: "Phones" }] },
    });
    mockedAxios.put.mockResolvedValueOnce({
      data: { success: false, message: "No permission" },
    });

    renderPage();

    await user.click(await screen.findByRole("button", { name: "Edit" }));
    const modal = await screen.findByTestId("modal-content");
    const modalInput = within(modal).getByTestId(
      "category-input"
    ) as HTMLInputElement;

    await user.clear(modalInput);
    await user.type(modalInput, "Gadgets");
    await user.click(within(modal).getByTestId("submit-button"));

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith("No permission")
    );
    expect(screen.getByTestId("modal-content")).toBeInTheDocument();
  });

  test("update → rejected: shows spelled toast, modal remains open", async () => {
    const user = getUser();
    mockedAxios.get.mockResolvedValueOnce({
      data: { success: true, category: [{ _id: "a1", name: "Phones" }] },
    });
    mockedAxios.put.mockRejectedValueOnce(new Error("net"));

    renderPage();

    await user.click(await screen.findByRole("button", { name: "Edit" }));
    const modal = await screen.findByTestId("modal-content");
    const modalInput = within(modal).getByTestId(
      "category-input"
    ) as HTMLInputElement;

    await user.clear(modalInput);
    await user.type(modalInput, "Gadgets");
    await user.click(within(modal).getByTestId("submit-button"));

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith("Something went wrong")
    );
    expect(screen.getByTestId("modal-content")).toBeInTheDocument();
  });

  test("delete → success: toasts and refetches (row removed)", async () => {
    const user = getUser();
    mockedAxios.get
      .mockResolvedValueOnce({
        data: { success: true, category: [{ _id: "a1", name: "Phones" }] },
      })
      .mockResolvedValueOnce({ data: { success: true, category: [] } });
    mockedAxios.delete.mockResolvedValueOnce({ data: { success: true } });

    renderPage();

    await user.click(await screen.findByRole("button", { name: "Delete" }));

    await waitFor(() =>
      expect(mockedAxios.delete).toHaveBeenCalledWith(
        "/api/v1/category/delete-category/a1"
      )
    );
    await waitFor(() =>
      expect(toastSuccess).toHaveBeenCalledWith("category is deleted")
    );
    await waitFor(() =>
      expect(screen.queryByText("Phones")).not.toBeInTheDocument()
    );
  });

  test("delete → success:false: shows API message", async () => {
    const user = getUser();
    mockedAxios.get.mockResolvedValueOnce({
      data: { success: true, category: [{ _id: "a1", name: "Phones" }] },
    });
    mockedAxios.delete.mockResolvedValueOnce({
      data: { success: false, message: "Protected" },
    });

    renderPage();

    await user.click(await screen.findByRole("button", { name: "Delete" }));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("Protected"));
  });

  test("modal can be closed via onCancel (X) without mutating data", async () => {
    const user = getUser();
    mockedAxios.get.mockResolvedValueOnce({
      data: { success: true, category: [{ _id: "a1", name: "Phones" }] },
    });

    renderPage();

    await user.click(await screen.findByRole("button", { name: "Edit" }));
    expect(await screen.findByTestId("modal-content")).toBeInTheDocument();

    await user.click(screen.getByTestId("modal-close"));

    await waitFor(() =>
      expect(screen.queryByTestId("modal-content")).not.toBeInTheDocument()
    );
    expect(screen.getByText("Phones")).toBeInTheDocument();
  });
});
