import "@testing-library/jest-dom";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import axios from "axios";
import { error as toastError, success as toastSuccess } from "react-hot-toast";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import CreateProduct from "./CreateProduct";

/** ========== Mocks ========== */

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
const mockedAxios = axios as unknown as { get: jest.Mock; post: jest.Mock };

// react-hot-toast: provide default export object AND named exports that point to the same fns
jest.mock("react-hot-toast", () => {
  const success = jest.fn();
  const error = jest.fn();
  return { success, error };
});

// Layout/AdminMenu passthrough
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

// useNavigate mock
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => {
  const real = jest.requireActual("react-router-dom");
  return { ...real, useNavigate: () => mockNavigate };
});

// AntD Select mock — respects explicit data-testid; falls back to placeholder for convenience
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
          {placeholder /* trailing spaces collapse in the DOM */}
        </option>
      ) : null}
      {children}
    </select>
  );

  (Select as any).Option = Option;

  return { Select };
});

/** Helper render */
function renderPage() {
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

describe("Admin/CreateProduct (unit)", () => {
  const origCreateObjURL = URL.createObjectURL;

  beforeEach(() => {
    jest.resetAllMocks();
    cleanup();
    (URL as any).createObjectURL = jest.fn(() => "blob:preview-url");
  });

  afterEach(() => {
    URL.createObjectURL = origCreateObjURL;
  });

  test("loads categories on mount and renders options", async () => {
    const cats = [
      { _id: "c1", name: "Phones" },
      { _id: "c2", name: "Laptops" },
    ];
    mockedAxios.get.mockResolvedValueOnce({
      data: { success: true, category: cats },
    });

    renderPage();

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledWith(
        "/api/v1/category/get-category"
      );
    });

    expect(await screen.findByTestId("option-c1")).toHaveTextContent("Phones");
    expect(screen.getByTestId("option-c2")).toHaveTextContent("Laptops");
  });

  test("shows toast on category fetch error (repo’s typo message)", async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error("boom"));

    renderPage();

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith(
        "Something went wrong in getting category"
      );
    });
  });

  test("category fetch returns success:false → no options populated and error toast", async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { success: false, category: [{ _id: "cX", name: "X" }] },
    });

    renderPage();

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    expect(screen.queryByTestId("option-cX")).not.toBeInTheDocument();
    expect(toastSuccess).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledWith("Failed to load categories");
  });

  test("fetch categories is called exactly once on mount", async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { success: true, category: [] },
    });

    renderPage();

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });
  });

  test("select placeholders are disabled and value changes on selection", async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { success: true, category: [{ _id: "c9", name: "Gadgets" }] },
    });

    renderPage();

    // Wait for options to be present before interacting (prevents race).
    await screen.findByTestId("option-c9");

    // Category
    const catSelect = screen.getByTestId("category-select");
    const catPlaceholder = (catSelect as HTMLSelectElement).querySelector(
      "option[value='']"
    );
    expect(catPlaceholder).toBeInTheDocument();
    expect(catPlaceholder).toBeDisabled();
    expect((catSelect as HTMLSelectElement).value).toBe("");

    fireEvent.change(catSelect, { target: { value: "c9" } });
    await waitFor(() =>
      expect((catSelect as HTMLSelectElement).value).toBe("c9")
    );

    // Shipping
    const shipSelect = screen.getByTestId(
      "shipping-select"
    ) as HTMLSelectElement;
    const shipPlaceholder = shipSelect.querySelector("option[value='']");
    expect(shipPlaceholder).toBeInTheDocument();
    expect(shipPlaceholder).toBeDisabled();
    // Do not assert a trailing space; browsers collapse it.
    expect(shipPlaceholder).toHaveTextContent(/^Select Shipping\s*$/);
    expect(shipSelect.value).toBe("");

    fireEvent.change(shipSelect, { target: { value: "1" } });
    await waitFor(() => expect(shipSelect.value).toBe("1"));
  });

  test("select category & shipping, fill fields, upload file → FormData contains expected values", async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { success: true, category: [{ _id: "c9", name: "Gadgets" }] },
    });
    mockedAxios.post.mockResolvedValueOnce({
      data: { success: true, message: "ok" },
    });

    renderPage();

    // Wait for the option to exist, then change
    await screen.findByTestId("option-c9");
    const catSelect = screen.getByTestId("category-select");
    fireEvent.change(catSelect, { target: { value: "c9" } });
    await waitFor(() =>
      expect((catSelect as HTMLSelectElement).value).toBe("c9")
    );

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

    const shipSelect = screen.getByTestId(
      "shipping-select"
    ) as HTMLSelectElement;
    fireEvent.change(shipSelect, { target: { value: "1" } });
    await waitFor(() => expect(shipSelect.value).toBe("1"));

    const file = new File([new Uint8Array([1, 2, 3])], "photo.png", {
      type: "image/png",
    });
    const fileInput = screen.getByLabelText(
      /Upload Photo/i
    ) as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /CREATE PRODUCT/i }));

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    });

    const [, sentFormData] = mockedAxios.post.mock.calls[0];
    expect(sentFormData).toBeInstanceOf(FormData);

    const vals: Record<string, any> = {};
    (sentFormData as FormData).forEach((v, k) => (vals[k] = v));

    expect(vals["name"]).toBe("Pixel 9");
    expect(vals["description"]).toBe("Nice phone");
    expect(vals["price"]).toBe("999");
    expect(vals["quantity"]).toBe("3");
    expect(vals["category"]).toBe("c9");
    expect(vals["photo"]).toBe(file);
    expect(vals["shipping"]).toBe("1"); // expect shipping to be appended
  });

  test("when no photo selected, 'photo' is not appended to FormData", async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { success: true, category: [] },
    });
    mockedAxios.post.mockResolvedValueOnce({ data: { success: true } });

    renderPage();

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

    fireEvent.click(screen.getByRole("button", { name: /CREATE PRODUCT/i }));

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    });

    const [, sentFormData] = mockedAxios.post.mock.calls[0];
    const vals: Record<string, any> = {};
    (sentFormData as FormData).forEach((v, k) => (vals[k] = v));

    expect(vals["photo"]).toBeUndefined();
  });

  test("renders uploaded photo name and preview image", async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { success: true, category: [] },
    });

    renderPage();

    const file = new File([new Uint8Array([7, 8])], "myimg.jpg", {
      type: "image/jpeg",
    });
    const input = screen.getByLabelText(/Upload Photo/i) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByText("myimg.jpg")).toBeInTheDocument();

    const img = screen.getByAltText("product_photo") as HTMLImageElement;
    expect(img).toHaveAttribute("src", "blob:preview-url");
  });

  test("on successful create: shows success toast and navigates", async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { success: true, category: [] },
    });
    mockedAxios.post.mockResolvedValueOnce({
      data: { success: true, message: "Created" },
    });

    renderPage();

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

    fireEvent.click(screen.getByRole("button", { name: /CREATE PRODUCT/i }));

    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith("Product Created Successfully");
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard/admin/products");
    });
  });

  test("on create failure (rejected): shows error toast and does not navigate", async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { success: true, category: [] },
    });
    mockedAxios.post.mockRejectedValueOnce(new Error("network"));

    renderPage();

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

    fireEvent.click(screen.getByRole("button", { name: /CREATE PRODUCT/i }));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("something went wrong");
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  test("on create failure (success:false): shows error toast with API message and does not navigate", async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { success: true, category: [] },
    });
    mockedAxios.post.mockResolvedValueOnce({
      data: { success: false, message: "Invalid input" },
    });

    renderPage();

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

    fireEvent.click(screen.getByRole("button", { name: /CREATE PRODUCT/i }));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("Invalid input");
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  test("submits even if category not chosen (category empty string submitted)", async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { success: true, category: [] },
    });
    mockedAxios.post.mockResolvedValueOnce({ data: { success: true } });

    renderPage();

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

    fireEvent.click(screen.getByRole("button", { name: /CREATE PRODUCT/i }));

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    });

    const [, sentFormData] = mockedAxios.post.mock.calls[0];
    const vals: Record<string, any> = {};
    (sentFormData as FormData).forEach((v, k) => (vals[k] = v));

    expect(vals["category"]).toBe("");
  });
});
