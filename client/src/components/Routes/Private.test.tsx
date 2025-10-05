import "@testing-library/jest-dom/extend-expect";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import api from "../../api";
import { useAuth as useAuthOriginal } from "../../context/auth";
import PrivateRoute from "./Private";

jest.mock("../../api", () => ({
  auth: {
    checkUserAuth: jest.fn(),
  },
}));
const mockApi = api.auth.checkUserAuth as jest.Mock;

// Mock Spinner component
jest.mock("../Spinner", () => () => (
  <div data-testid="spinner">Loading...</div>
));

// Mock useAuth hook
jest.mock("../../context/auth");
const mockUseAuth = useAuthOriginal as jest.Mock;

// Helper component for Outlet
function DummyOutlet() {
  return <div data-testid="outlet">Private Content</div>;
}

describe("PrivateRoute", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders Spinner when no token", () => {
    mockUseAuth.mockReturnValue([{ token: null }, jest.fn()]);
    render(
      <MemoryRouter>
        <PrivateRoute />
      </MemoryRouter>
    );
    expect(mockApi).not.toHaveBeenCalled();
    expect(screen.getByTestId("spinner")).toBeInTheDocument();
  });

  it("renders Spinner while checking user auth", async () => {
    mockUseAuth.mockReturnValue([{ token: "valid-token" }, jest.fn()]);
    mockApi.mockResolvedValueOnce({ data: { ok: false } });
    render(
      <MemoryRouter>
        <PrivateRoute />
      </MemoryRouter>
    );
    expect(screen.getByTestId("spinner")).toBeInTheDocument();
    await waitFor(() => {
      expect(mockApi).toHaveBeenCalled();
      expect(screen.getByTestId("spinner")).toBeInTheDocument();
    });
  });

  it("renders Outlet when user auth is ok", async () => {
    mockUseAuth.mockReturnValue([{ token: "valid-token" }, jest.fn()]);
    mockApi.mockResolvedValueOnce({ data: { ok: true } });
    render(
      <MemoryRouter initialEntries={["/private"]}>
        <Routes>
          <Route path="/private" Component={PrivateRoute}>
            <Route index Component={DummyOutlet} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(mockApi).toHaveBeenCalled();
      expect(screen.getByTestId("outlet")).toBeInTheDocument();
    });
  });

  it("renders Spinner when user auth is not ok", async () => {
    mockUseAuth.mockReturnValue([{ token: "valid-token" }, jest.fn()]);
    mockApi.mockResolvedValueOnce({ data: {}, status: 401 });
    render(
      <MemoryRouter initialEntries={["/private"]}>
        <Routes>
          <Route path="/private" Component={PrivateRoute}>
            <Route index Component={DummyOutlet} />
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
