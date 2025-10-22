import { render, screen, waitFor } from "@testing-library/react";
import * as userEventLib from "@testing-library/user-event";
import axios from "axios";
import React from "react";
import { error as toastError, success as toastSuccess } from "react-hot-toast";
import { MemoryRouter, useNavigate } from "react-router-dom";
import Login from "./Login";

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
  useLocation: () => ({ state: null }),
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

// Mock useAuth hook
const mockSetAuth = jest.fn();
jest.mock("../../context/auth", () => ({
  useAuth: () => [null, mockSetAuth],
}));

const renderLogin = () =>
  render(
    <MemoryRouter>
      <Login />
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
  localStorage.clear();
});

describe("Login Integration Tests", () => {
  describe("Successful Login Flow", () => {
    it("should login user successfully and navigate to homepage", async () => {
      const user = getUser();
      const mockResponse = {
        data: {
          success: true,
          message: "Login successful",
          user: {
            _id: "123",
            name: "John Doe",
            email: "john@example.com",
            role: 0,
          },
          token: "mock-jwt-token",
        },
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      renderLogin();

      // Fill in form
      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);
      const loginButton = screen.getByRole("button", { name: /login/i });

      await user.type(emailInput, "john@example.com");
      await user.type(passwordInput, "password123");
      await user.click(loginButton);

      // Verify API call
      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith("/api/v1/auth/login", {
          email: "john@example.com",
          password: "password123",
        });
      });

      // Verify auth context is updated
      await waitFor(() => {
        expect(mockSetAuth).toHaveBeenCalledWith({
          user: mockResponse.data.user,
          token: mockResponse.data.token,
        });
      });

      // Verify localStorage is updated
      await waitFor(() => {
        const storedAuth = localStorage.getItem("auth");
        expect(storedAuth).toBeTruthy();
        const parsedAuth = JSON.parse(storedAuth!);
        expect(parsedAuth.user.email).toBe("john@example.com");
        expect(parsedAuth.token).toBe("mock-jwt-token");
      });

      // Verify success toast
      expect(toastSuccess).toHaveBeenCalledWith(
        mockResponse.data.message,
        expect.any(Object)
      );

      // Verify navigation
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/");
      });
    });

    it("should navigate to location.state path after successful login", async () => {
      const user = getUser();
      const mockResponse = {
        data: {
          success: true,
          message: "Login successful",
          user: {
            _id: "123",
            name: "John Doe",
            email: "john@example.com",
            role: 0,
          },
          token: "mock-jwt-token",
        },
      };

      // Mock useLocation to return a state
      jest.spyOn(require("react-router-dom"), "useLocation").mockReturnValue({
        state: "/dashboard/user/profile",
      });

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      renderLogin();

      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);
      const loginButton = screen.getByRole("button", { name: /login/i });

      await user.type(emailInput, "john@example.com");
      await user.type(passwordInput, "password123");
      await user.click(loginButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/dashboard/user/profile");
      });
    });
  });

  describe("Failed Login Flow", () => {
    it("should show error toast when login fails due to invalid credentials", async () => {
      const user = getUser();
      const mockError = {
        response: {
          data: {
            success: false,
            message: "Invalid email or password",
          },
        },
      };

      mockedAxios.post.mockRejectedValueOnce(mockError);

      renderLogin();

      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);
      const loginButton = screen.getByRole("button", { name: /login/i });

      await user.type(emailInput, "wrong@example.com");
      await user.type(passwordInput, "wrongpassword");
      await user.click(loginButton);

      await waitFor(() => {
        expect(toastError).toHaveBeenCalledWith("Invalid email or password");
      });

      // Verify auth is not set
      expect(mockSetAuth).not.toHaveBeenCalled();
      expect(localStorage.getItem("auth")).toBeNull();
    });

    it("should show generic error when API throws unexpected error", async () => {
      const user = getUser();
      mockedAxios.post.mockRejectedValueOnce(new Error("Network error"));

      renderLogin();

      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);
      const loginButton = screen.getByRole("button", { name: /login/i });

      await user.type(emailInput, "john@example.com");
      await user.type(passwordInput, "password123");
      await user.click(loginButton);

      await waitFor(() => {
        expect(toastError).toHaveBeenCalledWith("Something went wrong");
      });
    });
  });

  describe("Form Validation", () => {
    it("should require email and password fields", async () => {
      const user = getUser();
      renderLogin();

      const loginButton = screen.getByRole("button", { name: /login/i });

      // Try to submit without filling fields
      await user.click(loginButton);

      // API should not be called
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it("should validate email format", async () => {
      renderLogin();

      const emailInput = screen.getByPlaceholderText(
        /enter your email/i
      ) as HTMLInputElement;

      expect(emailInput.type).toBe("email");
      expect(emailInput.required).toBe(true);
    });

    it("should validate password field", async () => {
      renderLogin();

      const passwordInput = screen.getByPlaceholderText(
        /enter your password/i
      ) as HTMLInputElement;

      expect(passwordInput.type).toBe("password");
      expect(passwordInput.required).toBe(true);
    });
  });

  describe("Forgot Password Navigation", () => {
    it("should navigate to forgot password page when button is clicked", async () => {
      const user = getUser();
      renderLogin();

      const forgotPasswordButton = screen.getByRole("button", {
        name: /forgot password/i,
      });
      await user.click(forgotPasswordButton);

      expect(mockNavigate).toHaveBeenCalledWith("/forgot-password");
    });
  });

  describe("UI Elements", () => {
    it("should render all form elements", () => {
      renderLogin();

      expect(
        screen.getByRole("heading", { name: /login form/i })
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText(/enter your email/i)
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText(/enter your password/i)
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /login/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /forgot password/i })
      ).toBeInTheDocument();
    });

    it("should have correct layout wrapper", () => {
      renderLogin();

      expect(screen.getByTestId("layout")).toBeInTheDocument();
    });
  });
});
