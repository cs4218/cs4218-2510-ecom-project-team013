import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock Functions
let handleSubmitMock = jest.fn((e) => e.preventDefault());
let setValueMock = jest.fn();

// Component Under test
import CategoryForm from "./CategoryForm";

// Setup Render
const renderComponent = (value: string = "") => {
  render(
    <CategoryForm
      value={value}
      setValue={setValueMock}
      handleSubmit={handleSubmitMock}
    />
  );
};

describe("CategoryForm Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders input and submit button", () => {
    renderComponent();

    const input = screen.getByTestId("category-input");
    const button = screen.getByTestId("submit-button");

    expect(input).toBeInTheDocument();
    expect(button).toBeInTheDocument();
  });

  it("renders value if existing data passed", () => {
    renderComponent("Category");

    const input = screen.getByTestId("category-input") as HTMLInputElement;
    const button = screen.getByTestId("submit-button");

    expect(input).toBeInTheDocument();
    expect(button).toBeInTheDocument();

    expect(input.value).toBe("Category");
  });

  it("calls setValue when typing into input", async () => {
    renderComponent();

    const input = screen.getByTestId("category-input");
    await act(async () => {
      await userEvent.type(input, "Category");
    });

    expect(setValueMock).toHaveBeenCalledTimes("Category".length);
    expect(setValueMock).toHaveBeenCalledWith("C");
    expect(setValueMock).toHaveBeenCalledWith("a");
    expect(setValueMock).toHaveBeenCalledWith("t");
  });

  it("calls handleSubmit when form is submitted", async () => {
    renderComponent();

    const button = screen.getByTestId("submit-button");
    await act(async () => {
      await userEvent.click(button);
    });

    expect(handleSubmitMock).toHaveBeenCalled();
  });
});
