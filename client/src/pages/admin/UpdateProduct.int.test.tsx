import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast, Toaster } from "react-hot-toast";
import { MemoryRouter } from "react-router-dom";
import api from "../../api";

// Setup Mock Components
jest.mock("../../components/Layout", () => ({ children }: any) => (
  <div data-testid="layout">{children}</div>
));

jest.mock("../../components/AdminMenu", () => () => (
  <div>Mocked AdminMenu</div>
));

// Setup React Router
const mockedNavigate = jest.fn();
const mockedUseParams = jest.fn();

jest.mock("react-router-dom", () => ({
  ...(jest.requireActual("react-router-dom") as any),
  useNavigate: () => mockedNavigate,
  useParams: () => mockedUseParams(),
}));

// Setup Mock API
jest.mock("../../api", () => ({
  product: {
    getSingleProduct: jest.fn(),
    updateProduct: jest.fn(),
    deleteProduct: jest.fn(),
  },
  category: {
    getAllCategories: jest.fn(),
  },
}));

// Setup Mock CreateObjectUrl
global.URL.createObjectURL = jest.fn(() => "mocked-blob-url");

// Component Under test
import UpdateProduct from "./UpdateProduct";

const productData = {
  product: {
    _id: "1",
    name: "Test Product",
    description: "Test Description",
    price: 100,
    quantity: 10,
    shipping: false,
    category: { _id: "1", name: "Category 1" },
  },
};

const categoriesData = {
  success: true,
  category: [
    { _id: "1", name: "Category 1" },
    { _id: "2", name: "Category 2" },
  ],
};

// Setup Render
const renderPage = () => {
  render(
    <MemoryRouter>
      <UpdateProduct />
      <Toaster />
    </MemoryRouter>
  );
};

describe("Update Product", () => {
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
    toast.dismiss();
  });

  afterEach(async () => {
    await act(async () => {
      toast.dismiss();
    });
    await waitFor(
      () => {
        expect(screen.queryByRole("status")).not.toBeInTheDocument();
      },
      { timeout: 3000 }
    );
    cleanup();
  });

  it("fetches product and categories on mount", async () => {
    mockedUseParams.mockReturnValue({ slug: "test-slug" });

    (api.product.getSingleProduct as jest.Mock).mockResolvedValue({
      data: productData,
    });
    (api.category.getAllCategories as jest.Mock).mockResolvedValue({
      data: categoriesData,
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("category-input")).toHaveTextContent(
        productData.product.category.name
      );
    });

    const img = screen.getByTestId("existing-photo-img") as HTMLImageElement;
    expect(img.src).toContain("/api/v1/product/product-photo/1");

    expect(screen.getByTestId("name-input")).toHaveValue(
      productData.product.name
    );
    expect(screen.getByTestId("description-input")).toHaveValue(
      productData.product.description
    );
    expect(screen.getByTestId("price-input")).toHaveValue(
      productData.product.price
    );
    expect(screen.getByTestId("quantity-input")).toHaveValue(
      productData.product.quantity
    );
    expect(screen.getByTestId("shipping-input")).toHaveTextContent("Yes");
  });

  it("Calls toast with error message when Product fails", async () => {
    mockedUseParams.mockReturnValue({ slug: "test-slug" });

    (api.product.getSingleProduct as jest.Mock).mockRejectedValueOnce(
      new Error("Error")
    );
    (api.category.getAllCategories as jest.Mock).mockResolvedValue({
      data: categoriesData,
    });

    renderPage();

    await waitFor(() => {
      expect(
        screen.getByText("Something went wrong in getting product")
      ).toBeInTheDocument();
    });
  });

  it("Calls toast with error message when Cateroy fails", async () => {
    mockedUseParams.mockReturnValue({ slug: "test-slug" });

    (api.product.getSingleProduct as jest.Mock).mockResolvedValue({
      data: productData,
    });
    (api.category.getAllCategories as jest.Mock).mockRejectedValueOnce(
      new Error("Error")
    );

    renderPage();

    await waitFor(() => {
      expect(
        screen.getByText("Something went wrong in getting category")
      ).toBeInTheDocument();
    });
  });

  it("updates preview when a new photo is uploaded", async () => {
    const file = new File(["dummy content"], "product.png", {
      type: "image/png",
    });

    mockedUseParams.mockReturnValue({ slug: "test-slug" });

    (api.product.getSingleProduct as jest.Mock).mockResolvedValue({
      data: productData,
    });
    (api.category.getAllCategories as jest.Mock).mockResolvedValue({
      data: categoriesData,
    });

    renderPage();

    const input = screen.getByTestId("photo-input");
    await act(async () => {
      userEvent.upload(input, file);
    });

    const img = screen.getByTestId("preview-photo-img") as HTMLImageElement;

    expect(img).toBeInTheDocument();
    expect(img.src).toContain("mocked-blob-url");
  });

  it("updates product with changed category", async () => {
    mockedUseParams.mockReturnValue({ slug: "test-slug" });

    (api.product.getSingleProduct as jest.Mock).mockResolvedValue({
      data: productData,
    });
    (api.category.getAllCategories as jest.Mock).mockResolvedValue({
      data: categoriesData,
    });
    (api.product.updateProduct as jest.Mock).mockResolvedValue({
      data: { success: true, message: "Product Updated Successfully" },
    });

    renderPage();

    // Wait for data to be loaded
    const categorySelect = (await screen.findByTestId(
      "category-input"
    )) as HTMLSelectElement;
    await waitFor(() => {
      expect(categorySelect.value).toBe(productData.product.category._id);
    });

    // Act
    await act(async () => {
      userEvent.selectOptions(categorySelect, "2");
    });

    const updateBtn = screen.getByTestId("update-btn");
    await act(async () => {
      userEvent.click(updateBtn);
    });

    expect(api.product.updateProduct as jest.Mock).toHaveBeenCalledTimes(1);

    const [_, formData] = (api.product.updateProduct as jest.Mock).mock
      .calls[0];
    expect(formData.category).toBe("2");

    await waitFor(() => {
      expect(
        screen.getByText("Product Updated Successfully")
      ).toBeInTheDocument();
    });
    expect(mockedNavigate).toHaveBeenCalledWith("/dashboard/admin/products");
  });

  it("updates product with a new photo", async () => {
    mockedUseParams.mockReturnValue({ slug: "test-slug" });

    (api.product.getSingleProduct as jest.Mock).mockResolvedValue({
      data: productData,
    });
    (api.category.getAllCategories as jest.Mock).mockResolvedValue({
      data: categoriesData,
    });
    (api.product.updateProduct as jest.Mock).mockResolvedValue({
      data: { success: true, message: "Product Updated Successfully" },
    });

    const file = new File(["dummy content"], "product.png", {
      type: "image/png",
    });

    renderPage();

    // Wait for data to be loaded
    const categorySelect = (await screen.findByTestId(
      "category-input"
    )) as HTMLSelectElement;
    await waitFor(() => {
      expect(categorySelect.value).toBe(productData.product.category._id);
    });

    // Act
    const input = screen.getByTestId("photo-input");
    await act(async () => {
      userEvent.upload(input, file);
    });

    const updateBtn = screen.getByTestId("update-btn");
    await act(async () => {
      userEvent.click(updateBtn);
    });

    expect(api.product.updateProduct as jest.Mock).toHaveBeenCalledTimes(1);

    const [_, formData] = (api.product.updateProduct as jest.Mock).mock
      .calls[0];
    expect(formData.photo).toBe(file);

    await waitFor(() => {
      expect(
        screen.getByText("Product Updated Successfully")
      ).toBeInTheDocument();
    });
    expect(mockedNavigate).toHaveBeenCalledWith("/dashboard/admin/products");
  });

  it("updates product with changed name", async () => {
    mockedUseParams.mockReturnValue({ slug: "test-slug" });

    (api.product.getSingleProduct as jest.Mock).mockResolvedValue({
      data: productData,
    });
    (api.category.getAllCategories as jest.Mock).mockResolvedValue({
      data: categoriesData,
    });
    (api.product.updateProduct as jest.Mock).mockResolvedValue({
      data: { success: true, message: "Product Updated Successfully" },
    });

    renderPage();

    // Wait for data to be loaded
    const nameInput = (await screen.findByTestId(
      "name-input"
    )) as HTMLInputElement;
    await waitFor(() => {
      expect(nameInput.value).toBe(productData.product.name);
    });

    // Act
    await act(async () => {
      await userEvent.clear(nameInput);
      userEvent.type(nameInput, "Updated Product Name");
    });

    const updateBtn = screen.getByTestId("update-btn");
    await act(async () => {
      userEvent.click(updateBtn);
    });

    expect(api.product.updateProduct as jest.Mock).toHaveBeenCalledTimes(1);

    const [_, formData] = (api.product.updateProduct as jest.Mock).mock
      .calls[0];
    expect(formData.name).toBe("Updated Product Name");

    await waitFor(() => {
      expect(
        screen.getByText("Product Updated Successfully")
      ).toBeInTheDocument();
    });
    expect(mockedNavigate).toHaveBeenCalledWith("/dashboard/admin/products");
  });

  it("updates description with changed description", async () => {
    mockedUseParams.mockReturnValue({ slug: "test-slug" });

    (api.product.getSingleProduct as jest.Mock).mockResolvedValue({
      data: productData,
    });
    (api.category.getAllCategories as jest.Mock).mockResolvedValue({
      data: categoriesData,
    });
    (api.product.updateProduct as jest.Mock).mockResolvedValue({
      data: { success: true, message: "Product Updated Successfully" },
    });

    renderPage();

    // Wait for data to be loaded
    const descriptionInput = (await screen.findByTestId(
      "description-input"
    )) as HTMLInputElement;
    await waitFor(() => {
      expect(descriptionInput.value).toBe(productData.product.description);
    });

    // Act
    await act(async () => {
      await userEvent.clear(descriptionInput);
      userEvent.type(descriptionInput, "Updated Description");
    });

    const updateBtn = screen.getByTestId("update-btn");
    await act(async () => {
      userEvent.click(updateBtn);
    });

    expect(api.product.updateProduct as jest.Mock).toHaveBeenCalledTimes(1);

    const [_, formData] = (api.product.updateProduct as jest.Mock).mock
      .calls[0];
    expect(formData.description).toBe("Updated Description");

    await waitFor(() => {
      expect(
        screen.getByText("Product Updated Successfully")
      ).toBeInTheDocument();
    });
    expect(mockedNavigate).toHaveBeenCalledWith("/dashboard/admin/products");
  });

  it("updates price with changed price", async () => {
    mockedUseParams.mockReturnValue({ slug: "test-slug" });

    (api.product.getSingleProduct as jest.Mock).mockResolvedValue({
      data: productData,
    });
    (api.category.getAllCategories as jest.Mock).mockResolvedValue({
      data: categoriesData,
    });
    (api.product.updateProduct as jest.Mock).mockResolvedValue({
      data: { success: true, message: "Product Updated Successfully" },
    });

    renderPage();

    // Wait for data to be loaded
    const priceInput = (await screen.findByTestId(
      "price-input"
    )) as HTMLInputElement;
    await waitFor(() => {
      expect(priceInput.value).toBe(String(productData.product.price));
    });

    // Act
    await act(async () => {
      await userEvent.clear(priceInput);
      userEvent.type(priceInput, "10.50");
    });

    const updateBtn = screen.getByTestId("update-btn");
    await act(async () => {
      userEvent.click(updateBtn);
    });

    expect(api.product.updateProduct as jest.Mock).toHaveBeenCalledTimes(1);

    const [_, formData] = (api.product.updateProduct as jest.Mock).mock
      .calls[0];
    expect(formData.price).toBe("10.50");

    await waitFor(() => {
      expect(
        screen.getByText("Product Updated Successfully")
      ).toBeInTheDocument();
    });
    expect(mockedNavigate).toHaveBeenCalledWith("/dashboard/admin/products");
  });

  it("updates quantity with changed quantity", async () => {
    mockedUseParams.mockReturnValue({ slug: "test-slug" });

    (api.product.getSingleProduct as jest.Mock).mockResolvedValue({
      data: productData,
    });
    (api.category.getAllCategories as jest.Mock).mockResolvedValue({
      data: categoriesData,
    });
    (api.product.updateProduct as jest.Mock).mockResolvedValue({
      data: { success: true, message: "Product Updated Successfully" },
    });

    renderPage();

    // Wait for data to be loaded
    const quantityInput = (await screen.findByTestId(
      "quantity-input"
    )) as HTMLInputElement;
    await waitFor(() => {
      expect(quantityInput.value).toBe(String(productData.product.quantity));
    });

    // Act
    await act(async () => {
      await userEvent.clear(quantityInput);
      userEvent.type(quantityInput, "150");
    });

    const updateBtn = screen.getByTestId("update-btn");
    await act(async () => {
      userEvent.click(updateBtn);
    });

    expect(api.product.updateProduct as jest.Mock).toHaveBeenCalledTimes(1);

    const [_, formData] = (api.product.updateProduct as jest.Mock).mock
      .calls[0];
    expect(formData.quantity).toBe("150");

    await waitFor(() => {
      expect(
        screen.getByText("Product Updated Successfully")
      ).toBeInTheDocument();
    });
    expect(mockedNavigate).toHaveBeenCalledWith("/dashboard/admin/products");
  });

  it("updates shipping with changed shipping", async () => {
    mockedUseParams.mockReturnValue({ slug: "test-slug" });

    (api.product.getSingleProduct as jest.Mock).mockResolvedValue({
      data: productData,
    });
    (api.category.getAllCategories as jest.Mock).mockResolvedValue({
      data: categoriesData,
    });
    (api.product.updateProduct as jest.Mock).mockResolvedValue({
      data: { success: true, message: "Product Updated Successfully" },
    });

    renderPage();

    // Wait for data to be loaded
    const shippingSelect = (await screen.findByTestId(
      "shipping-input"
    )) as HTMLSelectElement;
    await waitFor(() => {
      expect(shippingSelect.value === "true").toBe(
        productData.product.shipping
      );
    });

    // Act
    await act(async () => {
      userEvent.selectOptions(shippingSelect, "true");
    });

    const updateBtn = screen.getByTestId("update-btn");
    await act(async () => {
      userEvent.click(updateBtn);
    });

    expect(api.product.updateProduct as jest.Mock).toHaveBeenCalledTimes(1);

    const [_, formData] = (api.product.updateProduct as jest.Mock).mock
      .calls[0];
    expect(formData.shipping).toBe("true");

    await waitFor(() => {
      expect(
        screen.getByText("Product Updated Successfully")
      ).toBeInTheDocument();
    });
    expect(mockedNavigate).toHaveBeenCalledWith("/dashboard/admin/products");
  });

  it("shows toast error when update fails", async () => {
    mockedUseParams.mockReturnValue({ slug: "test-slug" });

    (api.product.getSingleProduct as jest.Mock).mockResolvedValue({
      data: productData,
    });
    (api.category.getAllCategories as jest.Mock).mockResolvedValue({
      data: categoriesData,
    });
    (api.product.updateProduct as jest.Mock).mockResolvedValue({
      data: { success: false, message: "Update failed" },
    });

    renderPage();

    // Wait for data to be loaded
    const categorySelect = (await screen.findByTestId(
      "category-input"
    )) as HTMLSelectElement;
    await waitFor(() => {
      expect(categorySelect.value).toBe(productData.product.category._id);
    });

    // Act
    const updateBtn = screen.getByTestId("update-btn");
    await act(async () => {
      userEvent.click(updateBtn);
    });

    await waitFor(() => {
      expect(screen.getByText("Update failed")).toBeInTheDocument();
    });
    expect(mockedNavigate).not.toHaveBeenCalled();
  });

  it("shows toast error with exception msg when update throws an exception with msg", async () => {
    mockedUseParams.mockReturnValue({ slug: "test-slug" });

    (api.product.getSingleProduct as jest.Mock).mockResolvedValue({
      data: productData,
    });
    (api.category.getAllCategories as jest.Mock).mockResolvedValue({
      data: categoriesData,
    });
    (api.product.updateProduct as jest.Mock).mockRejectedValueOnce(
      new Error("Network Error")
    );

    renderPage();

    // Wait for data to be loaded
    const categorySelect = (await screen.findByTestId(
      "category-input"
    )) as HTMLSelectElement;
    await waitFor(() => {
      expect(categorySelect.value).toBe(productData.product.category._id);
    });

    // Act
    const updateBtn = screen.getByTestId("update-btn");
    await act(async () => {
      userEvent.click(updateBtn);
    });

    await waitFor(() => {
      expect(screen.getByText("Network Error")).toBeInTheDocument();
    });
    expect(mockedNavigate).not.toHaveBeenCalled();
  });

  it("shows toast error without exception msg when update throws an exception without msg", async () => {
    mockedUseParams.mockReturnValue({ slug: "test-slug" });

    (api.product.getSingleProduct as jest.Mock).mockResolvedValue({
      data: productData,
    });
    (api.category.getAllCategories as jest.Mock).mockResolvedValue({
      data: categoriesData,
    });
    (api.product.updateProduct as jest.Mock).mockRejectedValueOnce(new Error());

    renderPage();

    // Wait for data to be loaded
    const categorySelect = (await screen.findByTestId(
      "category-input"
    )) as HTMLSelectElement;
    await waitFor(() => {
      expect(categorySelect.value).toBe(productData.product.category._id);
    });

    // Act
    const updateBtn = screen.getByTestId("update-btn");
    await act(async () => {
      userEvent.click(updateBtn);
    });

    await waitFor(() => {
      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    });
    expect(mockedNavigate).not.toHaveBeenCalled();
  });

  it("does nothing when user cancels confirm", async () => {
    mockedUseParams.mockReturnValue({ slug: "test-slug" });

    (api.product.getSingleProduct as jest.Mock).mockResolvedValue({
      data: productData,
    });
    (api.category.getAllCategories as jest.Mock).mockResolvedValue({
      data: categoriesData,
    });

    jest.spyOn(window, "confirm").mockReturnValue(false);

    renderPage();

    // Wait for data to be loaded
    const categorySelect = (await screen.findByTestId(
      "category-input"
    )) as HTMLSelectElement;
    await waitFor(() => {
      expect(categorySelect.value).toBe(productData.product.category._id);
    });

    // Act
    const deleteBtn = screen.getByTestId("delete-btn");
    await act(async () => {
      userEvent.click(deleteBtn);
    });

    expect(api.product.updateProduct as jest.Mock).not.toHaveBeenCalled();
    expect(mockedNavigate).not.toHaveBeenCalled();
  });

  it("calls API and shows success toast when deletion succeeds", async () => {
    mockedUseParams.mockReturnValue({ slug: "test-slug" });

    (api.product.getSingleProduct as jest.Mock).mockResolvedValue({
      data: productData,
    });
    (api.category.getAllCategories as jest.Mock).mockResolvedValue({
      data: categoriesData,
    });
    (api.product.deleteProduct as jest.Mock).mockResolvedValue({
      data: { success: true },
    });

    jest.spyOn(window, "confirm").mockReturnValue(true);

    renderPage();

    // Wait for data to be loaded
    const categorySelect = (await screen.findByTestId(
      "category-input"
    )) as HTMLSelectElement;
    await waitFor(() => {
      expect(categorySelect.value).toBe(productData.product.category._id);
    });

    // Act
    const deleteBtn = screen.getByTestId("delete-btn");
    await act(async () => {
      userEvent.click(deleteBtn);
    });

    expect(api.product.deleteProduct as jest.Mock).toHaveBeenCalledTimes(1);
    expect(api.product.deleteProduct as jest.Mock).toHaveBeenCalledWith("1");

    await waitFor(() => {
      expect(
        screen.getByText("Product Deleted Successfully")
      ).toBeInTheDocument();
    });
    expect(mockedNavigate).toHaveBeenCalledWith("/dashboard/admin/products");
  });

  it("shows error toast when API returns success: false", async () => {
    mockedUseParams.mockReturnValue({ slug: "test-slug" });

    (api.product.getSingleProduct as jest.Mock).mockResolvedValue({
      data: productData,
    });
    (api.category.getAllCategories as jest.Mock).mockResolvedValue({
      data: categoriesData,
    });
    (api.product.deleteProduct as jest.Mock).mockResolvedValue({
      data: { success: false, message: "Product Delete failed" },
    });

    jest.spyOn(window, "confirm").mockReturnValue(true);

    renderPage();

    // Wait for data to be loaded
    const categorySelect = (await screen.findByTestId(
      "category-input"
    )) as HTMLSelectElement;
    await waitFor(() => {
      expect(categorySelect.value).toBe(productData.product.category._id);
    });

    // Act
    const deleteBtn = screen.getByTestId("delete-btn");
    await act(async () => {
      userEvent.click(deleteBtn);
    });

    expect(api.product.deleteProduct as jest.Mock).toHaveBeenCalledTimes(1);
    expect(api.product.deleteProduct as jest.Mock).toHaveBeenCalledWith("1");

    await waitFor(() => {
      expect(screen.getByText("Product Delete failed")).toBeInTheDocument();
    });
    expect(mockedNavigate).not.toHaveBeenCalled();
  });

  it("shows error toast with custom msg when API call throws with msg", async () => {
    mockedUseParams.mockReturnValue({ slug: "test-slug" });

    (api.product.getSingleProduct as jest.Mock).mockResolvedValue({
      data: productData,
    });
    (api.category.getAllCategories as jest.Mock).mockResolvedValue({
      data: categoriesData,
    });
    (api.product.deleteProduct as jest.Mock).mockRejectedValue(
      new Error("Network Error")
    );

    jest.spyOn(window, "confirm").mockReturnValue(true);

    renderPage();

    // Wait for data to be loaded
    const categorySelect = (await screen.findByTestId(
      "category-input"
    )) as HTMLSelectElement;
    await waitFor(() => {
      expect(categorySelect.value).toBe(productData.product.category._id);
    });

    // Act
    const deleteBtn = screen.getByTestId("delete-btn");
    await act(async () => {
      userEvent.click(deleteBtn);
    });

    expect(api.product.deleteProduct as jest.Mock).toHaveBeenCalledTimes(1);
    expect(api.product.deleteProduct as jest.Mock).toHaveBeenCalledWith("1");

    await waitFor(() => {
      expect(screen.getByText("Network Error")).toBeInTheDocument();
    });
    expect(mockedNavigate).not.toHaveBeenCalled();
  });

  it("shows error toast with default msg when API call throws without msg", async () => {
    mockedUseParams.mockReturnValue({ slug: "test-slug" });

    (api.product.getSingleProduct as jest.Mock).mockResolvedValue({
      data: productData,
    });
    (api.category.getAllCategories as jest.Mock).mockResolvedValue({
      data: categoriesData,
    });
    (api.product.deleteProduct as jest.Mock).mockRejectedValue(new Error());

    jest.spyOn(window, "confirm").mockReturnValue(true);

    renderPage();

    // Wait for data to be loaded
    const categorySelect = (await screen.findByTestId(
      "category-input"
    )) as HTMLSelectElement;
    await waitFor(() => {
      expect(categorySelect.value).toBe(productData.product.category._id);
    });

    // Act
    const deleteBtn = screen.getByTestId("delete-btn");
    await act(async () => {
      userEvent.click(deleteBtn);
    });

    expect(api.product.deleteProduct as jest.Mock).toHaveBeenCalledTimes(1);
    expect(api.product.deleteProduct as jest.Mock).toHaveBeenCalledWith("1");

    await waitFor(() => {
      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    });
    expect(mockedNavigate).not.toHaveBeenCalled();
  });
});
