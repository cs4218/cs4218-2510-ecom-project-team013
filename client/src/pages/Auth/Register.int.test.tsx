import { render, screen, waitFor } from "@testing-library/react";
import * as userEventLib from "@testing-library/user-event";
import axios from "axios";
import React from "react";
import { error as toastError, success as toastSuccess } from "react-hot-toast";
import { MemoryRouter } from "react-router-dom";
import Register from "./Register";

function getUser() {
  const anyLib = userEventLib as any;
  const ue = anyLib.default ?? anyLib;
  return typeof ue.setup === "function" ? ue.setup() : ue;
}

// Mock axios
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
  post: jest.Mock;
};

// Mock react-hot-toast
jest.mock("react-hot-toast", () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

// Mock Layout component
jest.mock("../../components/Layout", () => {
  return ({
    children,
    title,
  }: {
    children: React.ReactNode;
    title: string;
  }) => (
    <div data-testid="layout">
      <title>{title}</title>
      {children}
    </div>
  );
});

const renderRegister = () =>
  render(
    <MemoryRouter>
      <Register />
    </MemoryRouter>
  );

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

describe("Register Integration Tests", () => {
  describe("Successful Registration Flow", () => {
    it("should register user successfully and navigate to login", async () => {
      const user = getUser();
      const mockResponse = {
        data: {
          success: true,
          message: "Register Successfully, please login",
        },
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      renderRegister();

      // Fill in all form fields
      await user.type(
        screen.getByPlaceholderText(/enter your name/i),
        "John Doe"
      );
      await user.type(
        screen.getByPlaceholderText(/enter your email/i),
        "john@example.com"
      );
      await user.type(
        screen.getByPlaceholderText(/enter your password/i),
        "Password123"
      );
      await user.type(
        screen.getByPlaceholderText(/enter your phone/i),
        "1234567890"
      );
      await user.type(
        screen.getByPlaceholderText(/enter your address/i),
        "123 Test Street"
      );
      await user.type(
        screen.getByPlaceholderText(/enter your dob/i),
        "2000-01-01"
      );
      await user.type(
        screen.getByPlaceholderText(/what is your favorite sport/i),
        "Football"
      );

      const registerButton = screen.getByRole("button", { name: /register/i });
      await user.click(registerButton);

      // Verify API call with correct data
      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith("/api/v1/auth/register", {
          name: "John Doe",
          email: "john@example.com",
          password: "Password123",
          phone: "1234567890",
          address: "123 Test Street",
          DOB: "2000-01-01",
          answer: "Football",
        });
      });

      // Verify success toast
      await waitFor(() => {
        expect(toastSuccess).toHaveBeenCalledWith(
          "Register Successfully, please login"
        );
      });

      // Verify navigation to login page
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/login");
      });
    });

    it("should handle registration with all required fields filled", async () => {
      const user = getUser();
      const mockResponse = {
        data: {
          success: true,
          message: "User registered successfully",
        },
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      renderRegister();

      // Fill required fields
      await user.type(
        screen.getByPlaceholderText(/enter your name/i),
        "Jane Smith"
      );
      await user.type(
        screen.getByPlaceholderText(/enter your email/i),
        "jane@example.com"
      );
      await user.type(
        screen.getByPlaceholderText(/enter your password/i),
        "SecurePass456"
      );
      await user.type(
        screen.getByPlaceholderText(/enter your phone/i),
        "9876543210"
      );
      await user.type(
        screen.getByPlaceholderText(/enter your address/i),
        "456 Main St"
      );
      await user.type(
        screen.getByPlaceholderText(/enter your dob/i),
        "1995-05-15"
      );
      await user.type(
        screen.getByPlaceholderText(/what is your favorite sport/i),
        "Basketball"
      );

      const registerButton = screen.getByRole("button", { name: /register/i });
      await user.click(registerButton);

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledTimes(1);
        expect(mockNavigate).toHaveBeenCalledWith("/login");
      });
    });
  });

  describe("Failed Registration Flow", () => {
    it("should show error toast when email already exists", async () => {
      const user = getUser();
      const mockResponse = {
        data: {
          success: false,
          message: "Already registered please login",
        },
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      renderRegister();

      await user.type(
        screen.getByPlaceholderText(/enter your name/i),
        "John Doe"
      );
      await user.type(
        screen.getByPlaceholderText(/enter your email/i),
        "existing@example.com"
      );
      await user.type(
        screen.getByPlaceholderText(/enter your password/i),
        "Password123"
      );
      await user.type(
        screen.getByPlaceholderText(/enter your phone/i),
        "1234567890"
      );
      await user.type(
        screen.getByPlaceholderText(/enter your address/i),
        "123 Test St"
      );
      await user.type(
        screen.getByPlaceholderText(/enter your dob/i),
        "2000-01-01"
      );
      await user.type(
        screen.getByPlaceholderText(/what is your favorite sport/i),
        "Soccer"
      );

      const registerButton = screen.getByRole("button", { name: /register/i });
      await user.click(registerButton);

      await waitFor(() => {
        expect(toastError).toHaveBeenCalledWith(
          "Already registered please login"
        );
      });

      // Should not navigate
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("should show generic error when API throws unexpected error", async () => {
      const user = getUser();
      mockedAxios.post.mockRejectedValueOnce(new Error("Network error"));

      renderRegister();

      await user.type(
        screen.getByPlaceholderText(/enter your name/i),
        "John Doe"
      );
      await user.type(
        screen.getByPlaceholderText(/enter your email/i),
        "john@example.com"
      );
      await user.type(
        screen.getByPlaceholderText(/enter your password/i),
        "Password123"
      );
      await user.type(
        screen.getByPlaceholderText(/enter your phone/i),
        "1234567890"
      );
      await user.type(
        screen.getByPlaceholderText(/enter your address/i),
        "123 Test St"
      );
      await user.type(
        screen.getByPlaceholderText(/enter your dob/i),
        "2000-01-01"
      );
      await user.type(
        screen.getByPlaceholderText(/what is your favorite sport/i),
        "Tennis"
      );

      const registerButton = screen.getByRole("button", { name: /register/i });
      await user.click(registerButton);

      await waitFor(() => {
        expect(toastError).toHaveBeenCalledWith("Something went wrong");
      });
    });

    it("should handle validation errors from backend", async () => {
      const user = getUser();
      const mockResponse = {
        data: {
          success: false,
          message: "Password must be at least 6 characters",
        },
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      renderRegister();

      await user.type(
        screen.getByPlaceholderText(/enter your name/i),
        "John Doe"
      );
      await user.type(
        screen.getByPlaceholderText(/enter your email/i),
        "john@example.com"
      );
      await user.type(
        screen.getByPlaceholderText(/enter your password/i),
        "123"
      ); // Short password
      await user.type(
        screen.getByPlaceholderText(/enter your phone/i),
        "1234567890"
      );
      await user.type(
        screen.getByPlaceholderText(/enter your address/i),
        "123 Test St"
      );
      await user.type(
        screen.getByPlaceholderText(/enter your dob/i),
        "2000-01-01"
      );
      await user.type(
        screen.getByPlaceholderText(/what is your favorite sport/i),
        "Hockey"
      );

      const registerButton = screen.getByRole("button", { name: /register/i });
      await user.click(registerButton);

      await waitFor(() => {
        expect(toastError).toHaveBeenCalledWith(
          "Password must be at least 6 characters"
        );
      });
    });
  });

  describe("Form Validation", () => {
    it("should require all fields", async () => {
      const user = getUser();
      renderRegister();

      const registerButton = screen.getByRole("button", { name: /register/i });

      // Try to submit without filling fields
      await user.click(registerButton);

      // API should not be called
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it("should validate email field is of type email", () => {
      renderRegister();

      const emailInput = screen.getByPlaceholderText(
        /enter your email/i
      ) as HTMLInputElement;

      expect(emailInput.type).toBe("email");
      expect(emailInput.required).toBe(true);
    });

    it("should validate password field is of type password", () => {
      renderRegister();

      const passwordInput = screen.getByPlaceholderText(
        /enter your password/i
      ) as HTMLInputElement;

      expect(passwordInput.type).toBe("password");
      expect(passwordInput.required).toBe(true);
    });

    it("should validate all required fields have required attribute", () => {
      renderRegister();

      const nameInput = screen.getByPlaceholderText(
        /enter your name/i
      ) as HTMLInputElement;
      const emailInput = screen.getByPlaceholderText(
        /enter your email/i
      ) as HTMLInputElement;
      const passwordInput = screen.getByPlaceholderText(
        /enter your password/i
      ) as HTMLInputElement;
      const phoneInput = screen.getByPlaceholderText(
        /enter your phone/i
      ) as HTMLInputElement;
      const addressInput = screen.getByPlaceholderText(
        /enter your address/i
      ) as HTMLInputElement;
      const dobInput = screen.getByPlaceholderText(
        /enter your dob/i
      ) as HTMLInputElement;
      const answerInput = screen.getByPlaceholderText(
        /what is your favorite sport/i
      ) as HTMLInputElement;

      expect(nameInput.required).toBe(true);
      expect(emailInput.required).toBe(true);
      expect(passwordInput.required).toBe(true);
      expect(phoneInput.required).toBe(true);
      expect(addressInput.required).toBe(true);
      expect(dobInput.required).toBe(true);
      expect(answerInput.required).toBe(true);
    });

    it("should have DOB field as type Date", () => {
      renderRegister();

      const dobInput = screen.getByPlaceholderText(
        /enter your dob/i
      ) as HTMLInputElement;

      expect(dobInput.type).toBe("date");
    });
  });

  describe("Form State Management", () => {
    it("should update form state when user types", async () => {
      const user = getUser();
      renderRegister();

      const nameInput = screen.getByPlaceholderText(
        /enter your name/i
      ) as HTMLInputElement;
      await user.type(nameInput, "Test User");

      expect(nameInput.value).toBe("Test User");
    });

    it("should clear form after successful registration", async () => {
      const user = getUser();
      const mockResponse = {
        data: {
          success: true,
          message: "Register Successfully, please login",
        },
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      renderRegister();

      await user.type(
        screen.getByPlaceholderText(/enter your name/i),
        "John Doe"
      );
      await user.type(
        screen.getByPlaceholderText(/enter your email/i),
        "john@example.com"
      );
      await user.type(
        screen.getByPlaceholderText(/enter your password/i),
        "Password123"
      );
      await user.type(
        screen.getByPlaceholderText(/enter your phone/i),
        "1234567890"
      );
      await user.type(
        screen.getByPlaceholderText(/enter your address/i),
        "123 Test St"
      );
      await user.type(
        screen.getByPlaceholderText(/enter your dob/i),
        "2000-01-01"
      );
      await user.type(
        screen.getByPlaceholderText(/what is your favorite sport/i),
        "Cricket"
      );

      const registerButton = screen.getByRole("button", { name: /register/i });
      await user.click(registerButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/login");
      });
    });
  });

  describe("UI Elements", () => {
    it("should render all form elements", () => {
      renderRegister();

      expect(
        screen.getByRole("heading", { name: /register form/i })
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText(/enter your name/i)
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText(/enter your email/i)
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText(/enter your password/i)
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText(/enter your phone/i)
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText(/enter your address/i)
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText(/enter your dob/i)
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText(/what is your favorite sport/i)
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /register/i })
      ).toBeInTheDocument();
    });

    it("should have correct layout wrapper", () => {
      renderRegister();

      expect(screen.getByTestId("layout")).toBeInTheDocument();
    });

    it("should have correct title", () => {
      renderRegister();

      const layout = screen.getByTestId("layout");
      expect(layout.querySelector("title")?.textContent).toBe(
        "Register - Ecommerce App"
      );
    });
  });

  describe("Integration with API", () => {
    it("should send correct data structure to API", async () => {
      const user = getUser();
      const mockResponse = {
        data: {
          success: true,
          message: "Register Successfully, please login",
        },
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      renderRegister();

      const testData = {
        name: "Integration Test User",
        email: "integration@test.com",
        password: "TestPassword123",
        phone: "5555555555",
        address: "789 Integration Ave",
        DOB: "1990-12-25",
        answer: "Running",
      };

      await user.type(
        screen.getByPlaceholderText(/enter your name/i),
        testData.name
      );
      await user.type(
        screen.getByPlaceholderText(/enter your email/i),
        testData.email
      );
      await user.type(
        screen.getByPlaceholderText(/enter your password/i),
        testData.password
      );
      await user.type(
        screen.getByPlaceholderText(/enter your phone/i),
        testData.phone
      );
      await user.type(
        screen.getByPlaceholderText(/enter your address/i),
        testData.address
      );
      await user.type(
        screen.getByPlaceholderText(/enter your dob/i),
        testData.DOB
      );
      await user.type(
        screen.getByPlaceholderText(/what is your favorite sport/i),
        testData.answer
      );

      const registerButton = screen.getByRole("button", { name: /register/i });
      await user.click(registerButton);

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith(
          "/api/v1/auth/register",
          testData
        );
      });
    });
  });
});
