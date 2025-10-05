import { act, render, screen } from "@testing-library/react";
import { AuthProvider, useAuth } from "./auth";

// Helper to set up a test component using useAuth
function TestComponent() {
  const [auth, setAuth] = useAuth();
  return (
    <div>
      <span data-testid="user">{String(auth.user)}</span>
      <span data-testid="token">{auth.token}</span>
      <button onClick={() => setAuth({ user: "testuser", token: "abc123" })}>
        Update
      </button>
    </div>
  );
}

describe("AuthProvider and useAuth", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.resetAllMocks();
  });

  test("provides default auth state", () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    expect(screen.getByTestId("user").textContent).toBe("null");
    expect(screen.getByTestId("token").textContent).toBe("");
  });

  test("updates auth state via setAuth", () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    act(() => {
      screen.getByText("Update").click();
    });
    expect(screen.getByTestId("user").textContent).toBe("testuser");
    expect(screen.getByTestId("token").textContent).toBe("abc123");
  });

  test("loads auth state from localStorage on mount", () => {
    localStorage.setItem(
      "auth",
      JSON.stringify({ user: "storedUser", token: "storedToken" })
    );
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    expect(screen.getByTestId("user").textContent).toBe("storedUser");
    expect(screen.getByTestId("token").textContent).toBe("storedToken");
  });

  test("throws error if useAuth is called outside AuthProvider", () => {
    // Suppress error output for this test
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    function BadComponent() {
      useAuth();
      return null;
    }
    expect(() => render(<BadComponent />)).toThrow(
      "useAuth must be used within an AuthProvider"
    );
    spy.mockRestore();
  });
});
