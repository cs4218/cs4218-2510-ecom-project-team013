import "@testing-library/jest-dom/extend-expect";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import api from "../../api";
import { useAuth } from "../../context/auth";
import AdminRoute from "./AdminRoute";

jest.mock("../../api", () => ({
  auth: {
    checkAdminAuth: jest.fn(),
  },
}));
const mockApi = api.auth.checkAdminAuth as jest.Mock;

// Mock Spinner component
jest.mock("../Spinner", () => () => (
  <div data-testid="spinner">Loading...</div>
));

// Mock useAuth hook
jest.mock("../../context/auth");
const mockUseAuth = useAuth as jest.Mock;

// Helper component for Outlet
function DummyOutlet() {
  return <div data-testid="outlet">Admin Content</div>;
}

describe("AdminRoute", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders Spinner when no token", () => {
    mockUseAuth.mockReturnValue([{ token: null }, jest.fn()]);
    render(
      <MemoryRouter>
        <AdminRoute />
      </MemoryRouter>
    );
    expect(mockApi).not.toHaveBeenCalled();
    expect(screen.getByTestId("spinner")).toBeInTheDocument();
  });

  it("renders Spinner while checking admin auth", async () => {
    mockUseAuth.mockReturnValue([{ token: "valid-token" }, jest.fn()]);
    mockApi.mockResolvedValueOnce({ data: { ok: false } });
    render(
      <MemoryRouter>
        <AdminRoute />
      </MemoryRouter>
    );
    expect(mockApi).toHaveBeenCalled();
    expect(screen.getByTestId("spinner")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId("spinner")).toBeInTheDocument();
    });
  });

  it("renders Outlet when admin auth is ok", async () => {
    mockUseAuth.mockReturnValue([{ token: "valid-token" }, jest.fn()]);
    mockApi.mockResolvedValueOnce({ data: { ok: true } });
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <Routes>
          <Route path="/admin" element={<AdminRoute />}>
            <Route index element={<DummyOutlet />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(mockApi).toHaveBeenCalled();
      expect(screen.getByTestId("outlet")).toBeInTheDocument();
    });
  });

  it("renders Spinner when admin auth is not ok", async () => {
    mockUseAuth.mockReturnValue([{ token: "valid-token" }, jest.fn()]);
    mockApi.mockResolvedValueOnce({ data: {}, status: 401 });
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <Routes>
          <Route path="/admin" element={<AdminRoute />}>
            <Route index element={<DummyOutlet />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(mockApi).toHaveBeenCalled();
      expect(screen.getByTestId("spinner")).toBeInTheDocument();
    });
  });
});
