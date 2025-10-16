import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import axios from "axios";
import { error as toastError, success as toastSuccess } from "react-hot-toast";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import CreateProduct from "./CreateProduct";

/* -------------------- transport mock (axios) -------------------- */
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
const mockedAxios = axios as unknown as { get: jest.Mock; post: jest.Mock };

/* -------------------- toast mock -------------------- */
jest.mock("react-hot-toast", () => {
  const success = jest.fn();
  const error = jest.fn();
  return { success, error };
});

/* -------------------- layout/menu passthrough -------------------- */
jest.mock(
  "../../components/Layout",
  () =>
    ({ children }: { children: React.ReactNode }) => (
      <div data-testid="layout">{children}</div>
    )
);
jest.mock("../../components/AdminMenu", () => () => (
  <div data-testid="admin-menu" />
));

/* -------------------- useNavigate mock -------------------- */
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => {
  const real = jest.requireActual("react-router-dom");
  return { ...real, useNavigate: () => mockNavigate };
});

/* -------------------- AntD Select mock -------------------- */
jest.mock("antd", () => {
  const Option = ({ value, children }: any) => (
    <option value={value} data-testid={`option-${value}`}>
      {children}
    </option>
  );

  const Select = ({
    onChange,
    children,
    placeholder,
    className,
    value,
    defaultValue,
    ["data-testid"]: testId,
    ["aria-label"]: ariaLabel,
  }: any) => (
    <select
      data-testid={testId ?? placeholder ?? "select"}
      aria-label={ariaLabel}
      className={className}
      value={value ?? ""}
      defaultValue={defaultValue}
      onChange={(e) => onChange?.((e.target as HTMLSelectElement).value)}
    >
      {placeholder ? (
        <option value="" disabled>
          {placeholder}
        </option>
      ) : null}
      {children}
    </select>
  );

  (Select as any).Option = Option;

  return { Select };
});

/* -------------------- helpers -------------------- */
function renderAt() {
  return render(
    <MemoryRouter initialEntries={["/dashboard/admin/create-product"]}>
      <Routes>
        <Route
          path="/dashboard/admin/create-product"
          element={<CreateProduct />}
        />
      </Routes>
    </MemoryRouter>
  );
}

// Always render inside act to silence “updates not wrapped in act” warnings
async function renderAndFlush() {
  await act(async () => {
    renderAt();
  });
}

describe("Admin/CreateProduct (integration-lite, axios-only mock)", () => {
  const origCreateObjURL = URL.createObjectURL;

  beforeEach(() => {
    jest.resetAllMocks();
    (URL as any).createObjectURL = jest.fn(() => "blob:preview-url");
    mockNavigate.mockReset();
  });

  afterEach(() => {
    URL.createObjectURL = origCreateObjURL;
  });

  test("loads categories on mount from correct endpoint and renders options", async () => {
    const cats = [
      { _id: "c1", name: "Phones" },
      { _id: "c2", name: "Laptops" },
    ];
    mockedAxios.get.mockResolvedValueOnce({
      data: { success: true, category: cats },
    });

    await renderAndFlush();

    await waitFor(() =>
      expect(mockedAxios.get).toHaveBeenCalledWith(
        "/api/v1/category/get-category"
      )
    );

    expect(await screen.findByTestId("option-c1")).toHaveTextContent("Phones");
    expect(screen.getByTestId("option-c2")).toHaveTextContent("Laptops");
  });

  test("category fetch rejected → error toast with repo message", async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error("boom"));

    await renderAndFlush();

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith(
        "Something went wrong in getting category"
      )
    );
  });

  test("category fetch success:false → shows API error and no options", async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        success: false,
        message: "Nope",
        category: [{ _id: "cX", name: "X" }],
      },
    });

    await renderAndFlush();

    await waitFor(() => expect(mockedAxios.get).toHaveBeenCalledTimes(1));
    expect(toastError).toHaveBeenCalledWith("Nope");
    expect(screen.queryByTestId("option-cX")).not.toBeInTheDocument();
  });

  test("select placeholders disabled; user can choose category and shipping", async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { success: true, category: [{ _id: "c9", name: "Gadgets" }] },
    });

    await renderAndFlush();

    await screen.findByTestId("option-c9");

    const catSelect = screen.getByTestId(
      "category-select"
    ) as HTMLSelectElement;
    const shipSelect = screen.getByTestId(
      "shipping-select"
    ) as HTMLSelectElement;

    expect(catSelect.value).toBe("");
    expect(shipSelect.value).toBe("");

    await act(async () => {
      fireEvent.change(catSelect, { target: { value: "c9" } });
    });
    expect(catSelect.value).toBe("c9");

    await act(async () => {
      fireEvent.change(shipSelect, { target: { value: "1" } });
    });
    expect(shipSelect.value).toBe("1");
  });

  test("file upload shows filename and preview image via createObjectURL", async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { success: true, category: [] },
    });

    await renderAndFlush();

    const file = new File([new Uint8Array([7, 8])], "myimg.jpg", {
      type: "image/jpeg",
    });
    const input = screen.getByLabelText(/Upload Photo/i) as HTMLInputElement;

    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    expect(screen.getByText("myimg.jpg")).toBeInTheDocument();
    const img = screen.getByAltText("product_photo") as HTMLImageElement;
    expect(img).toHaveAttribute("src", "blob:preview-url");
  });

  test("submit success: calls endpoint with FormData, shows success toast, navigates", async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { success: true, category: [] },
    });
    mockedAxios.post.mockResolvedValueOnce({
      data: { success: true, message: "ok" },
    });

    await renderAndFlush();

    fireEvent.change(screen.getByPlaceholderText("write a name"), {
      target: { value: "Pixel 9" },
    });
    fireEvent.change(screen.getByPlaceholderText("write a description"), {
      target: { value: "Nice phone" },
    });
    fireEvent.change(screen.getByPlaceholderText("write a Price"), {
      target: { value: "999" },
    });
    fireEvent.change(screen.getByPlaceholderText("write a quantity"), {
      target: { value: "3" },
    });

    const shipSelect = screen.getByTestId("shipping-select");
    fireEvent.change(shipSelect, { target: { value: "1" } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /CREATE PRODUCT/i }));
    });

    await waitFor(() => expect(mockedAxios.post).toHaveBeenCalledTimes(1));

    const [url, sentFormData] = mockedAxios.post.mock.calls[0];
    expect(url).toBe("/api/v1/product/create-product");

    const vals: Record<string, any> = {};
    (sentFormData as FormData).forEach((v, k) => (vals[k] = v));

    expect(vals.name).toBe("Pixel 9");
    expect(vals.description).toBe("Nice phone");
    expect(vals.price).toBe("999");
    expect(vals.quantity).toBe("3");
    expect(vals.category).toBe(""); // no category chosen
    expect(vals.shipping).toBe("1");

    expect(toastSuccess).toHaveBeenCalledWith("Product Created Successfully");
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard/admin/products");
  });

  test("submit with no photo: 'photo' is not appended", async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { success: true, category: [] },
    });
    mockedAxios.post.mockResolvedValueOnce({ data: { success: true } });

    await renderAndFlush();

    fireEvent.change(screen.getByPlaceholderText("write a name"), {
      target: { value: "NoPic" },
    });
    fireEvent.change(screen.getByPlaceholderText("write a description"), {
      target: { value: "Desc" },
    });
    fireEvent.change(screen.getByPlaceholderText("write a Price"), {
      target: { value: "3" },
    });
    fireEvent.change(screen.getByPlaceholderText("write a quantity"), {
      target: { value: "1" },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /CREATE PRODUCT/i }));
    });

    await waitFor(() => expect(mockedAxios.post).toHaveBeenCalledTimes(1));

    const [, sentFormData] = mockedAxios.post.mock.calls[0];
    const vals: Record<string, any> = {};
    (sentFormData as FormData).forEach((v, k) => (vals[k] = v));

    expect(vals.photo).toBeUndefined();
  });

  test("submit rejected (network): shows error toast and stays on page", async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { success: true, category: [] },
    });
    mockedAxios.post.mockRejectedValueOnce(new Error("net"));

    await renderAndFlush();

    fireEvent.change(screen.getByPlaceholderText("write a name"), {
      target: { value: "X" },
    });
    fireEvent.change(screen.getByPlaceholderText("write a description"), {
      target: { value: "Y" },
    });
    fireEvent.change(screen.getByPlaceholderText("write a Price"), {
      target: { value: "1" },
    });
    fireEvent.change(screen.getByPlaceholderText("write a quantity"), {
      target: { value: "2" },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /CREATE PRODUCT/i }));
    });

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith("something went wrong")
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test("submit resolves with success:false: shows API message and does not navigate", async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { success: true, category: [] },
    });
    mockedAxios.post.mockResolvedValueOnce({
      data: { success: false, message: "Invalid input" },
    });

    await renderAndFlush();

    fireEvent.change(screen.getByPlaceholderText("write a name"), {
      target: { value: "X" },
    });
    fireEvent.change(screen.getByPlaceholderText("write a description"), {
      target: { value: "Y" },
    });
    fireEvent.change(screen.getByPlaceholderText("write a Price"), {
      target: { value: "1" },
    });
    fireEvent.change(screen.getByPlaceholderText("write a quantity"), {
      target: { value: "2" },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /CREATE PRODUCT/i }));
    });

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("Invalid input");
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  test("submits even if category not chosen: category empty string sent", async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { success: true, category: [] },
    });
    mockedAxios.post.mockResolvedValueOnce({ data: { success: true } });

    await renderAndFlush();

    fireEvent.change(screen.getByPlaceholderText("write a name"), {
      target: { value: "NoCat" },
    });
    fireEvent.change(screen.getByPlaceholderText("write a description"), {
      target: { value: "Desc" },
    });
    fireEvent.change(screen.getByPlaceholderText("write a Price"), {
      target: { value: "10" },
    });
    fireEvent.change(screen.getByPlaceholderText("write a quantity"), {
      target: { value: "1" },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /CREATE PRODUCT/i }));
    });

    await waitFor(() => expect(mockedAxios.post).toHaveBeenCalledTimes(1));

    const [, sentFormData] = mockedAxios.post.mock.calls[0];
    const vals: Record<string, any> = {};
    (sentFormData as FormData).forEach((v, k) => (vals[k] = v));

    expect(vals.category).toBe("");
  });

  test("category success:true but missing/invalid payload → no crash, no options, can still submit", async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { success: true } as any });
    mockedAxios.post.mockResolvedValueOnce({ data: { success: true } });

    await renderAndFlush();

    // Assert category select only has the placeholder option
    const catSelect = screen.getByTestId("category-select");
    const catOptions = within(catSelect).getAllByRole("option");
    expect(catOptions).toHaveLength(1);
    expect(catOptions[0]).toHaveTextContent(/Select a category/i);

    fireEvent.change(screen.getByPlaceholderText("write a name"), {
      target: { value: "A" },
    });
    fireEvent.change(screen.getByPlaceholderText("write a description"), {
      target: { value: "B" },
    });
    fireEvent.change(screen.getByPlaceholderText("write a Price"), {
      target: { value: "5" },
    });
    fireEvent.change(screen.getByPlaceholderText("write a quantity"), {
      target: { value: "9" },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /CREATE PRODUCT/i }));
    });

    await waitFor(() => expect(mockedAxios.post).toHaveBeenCalledTimes(1));
  });

  test("shipping 'No' (value '0') is preserved in FormData", async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { success: true, category: [{ _id: "c9", name: "Gadgets" }] },
    });
    mockedAxios.post.mockResolvedValueOnce({ data: { success: true } });

    await renderAndFlush();

    await screen.findByTestId("option-c9");

    const shipSelect = screen.getByTestId(
      "shipping-select"
    ) as HTMLSelectElement;
    fireEvent.change(shipSelect, { target: { value: "0" } });

    fireEvent.change(screen.getByPlaceholderText("write a name"), {
      target: { value: "A" },
    });
    fireEvent.change(screen.getByPlaceholderText("write a description"), {
      target: { value: "B" },
    });
    fireEvent.change(screen.getByPlaceholderText("write a Price"), {
      target: { value: "5" },
    });
    fireEvent.change(screen.getByPlaceholderText("write a quantity"), {
      target: { value: "9" },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /CREATE PRODUCT/i }));
    });

    await waitFor(() => expect(mockedAxios.post).toHaveBeenCalledTimes(1));

    const [, sentFormData] = mockedAxios.post.mock.calls[0];
    const vals: Record<string, any> = {};
    (sentFormData as FormData).forEach((v, k) => (vals[k] = v));
    expect(vals.shipping).toBe("0");
  });

  test("category fetch pending does not block typing and submit; POST sends empty category", async () => {
    let resolveCats!: (v: any) => void;
    const slowCats = new Promise((res) => (resolveCats = res));

    mockedAxios.get.mockImplementationOnce(() => slowCats as any);
    mockedAxios.post.mockResolvedValueOnce({ data: { success: true } });

    await renderAndFlush();

    fireEvent.change(screen.getByPlaceholderText("write a name"), {
      target: { value: "A" },
    });
    fireEvent.change(screen.getByPlaceholderText("write a description"), {
      target: { value: "B" },
    });
    fireEvent.change(screen.getByPlaceholderText("write a Price"), {
      target: { value: "5" },
    });
    fireEvent.change(screen.getByPlaceholderText("write a quantity"), {
      target: { value: "9" },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /CREATE PRODUCT/i }));
    });

    await waitFor(() => expect(mockedAxios.post).toHaveBeenCalledTimes(1));

    const [, sentFormData] = mockedAxios.post.mock.calls[0];
    const vals: Record<string, any> = {};
    (sentFormData as FormData).forEach((v, k) => (vals[k] = v));
    expect(vals.category).toBe("");

    // finish the pending GET to avoid dangling promises noise
    await act(async () => {
      resolveCats({ data: { success: true, category: [] } });
    });
  });

  test("file cleared after upload removes preview and omits photo in FormData", async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { success: true, category: [] },
    });
    mockedAxios.post.mockResolvedValueOnce({ data: { success: true } });

    await renderAndFlush();

    const input = screen.getByLabelText(/Upload Photo/i) as HTMLInputElement;

    const file = new File([new Uint8Array([1, 2, 3])], "photo.png", {
      type: "image/png",
    });
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });
    expect(screen.getByText("photo.png")).toBeInTheDocument();
    expect(screen.getByAltText("product_photo")).toBeInTheDocument();

    await act(async () => {
      fireEvent.change(input, { target: { files: [] } });
    });
    expect(screen.queryByAltText("product_photo")).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("write a name"), {
      target: { value: "A" },
    });
    fireEvent.change(screen.getByPlaceholderText("write a description"), {
      target: { value: "B" },
    });
    fireEvent.change(screen.getByPlaceholderText("write a Price"), {
      target: { value: "5" },
    });
    fireEvent.change(screen.getByPlaceholderText("write a quantity"), {
      target: { value: "9" },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /CREATE PRODUCT/i }));
    });

    await waitFor(() => expect(mockedAxios.post).toHaveBeenCalledTimes(1));
    const [, sentFormData] = mockedAxios.post.mock.calls[0];
    const vals: Record<string, any> = {};
    (sentFormData as FormData).forEach((v, k) => (vals[k] = v));
    expect(vals.photo).toBeUndefined();
  });

  test("endpoint correctness guard for categories and create-product", async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { success: true, category: [] },
    });
    mockedAxios.post.mockResolvedValueOnce({ data: { success: true } });

    await renderAndFlush();

    await waitFor(() =>
      expect(mockedAxios.get).toHaveBeenCalledWith(
        "/api/v1/category/get-category"
      )
    );

    fireEvent.change(screen.getByPlaceholderText("write a name"), {
      target: { value: "A" },
    });
    fireEvent.change(screen.getByPlaceholderText("write a description"), {
      target: { value: "B" },
    });
    fireEvent.change(screen.getByPlaceholderText("write a Price"), {
      target: { value: "5" },
    });
    fireEvent.change(screen.getByPlaceholderText("write a quantity"), {
      target: { value: "9" },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /CREATE PRODUCT/i }));
    });

    await waitFor(() => expect(mockedAxios.post).toHaveBeenCalledTimes(1));
    const [url] = mockedAxios.post.mock.calls[0];
    expect(url).toBe("/api/v1/product/create-product");
  });
});
