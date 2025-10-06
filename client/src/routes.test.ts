import routes from "./routes";

describe("App routes configuration", () => {
  it("should export an array of RouteObjects", () => {
    expect(Array.isArray(routes)).toBe(true);
    routes.forEach((route) => {
      expect(typeof route).toBe("object");
      expect(route).toHaveProperty("path");
      expect(route).toHaveProperty("Component");
    });
  });

  it("should contain the expected public routes", () => {
    const publicPaths = [
      "/",
      "/product/:slug",
      "/categories",
      "/cart",
      "/category/:slug",
      "/search",
      "/register",
      "/login",
      "/about",
      "/contact",
      "/policy",
      "*",
    ];
    publicPaths.forEach((path) => {
      expect(routes.some((route) => route.path === path)).toBe(true);
    });
  });

  it("should contain dashboard routes for PrivateRoute", () => {
    const privateRoute = routes.find(
      (route) =>
        route.path === "/dashboard" && route.Component.name === "PrivateRoute"
    );
    expect(privateRoute).toBeDefined();
    expect(Array.isArray(privateRoute?.children)).toBe(true);
    const userPaths = ["user", "user/orders", "user/profile"];
    userPaths.forEach((childPath) => {
      expect(
        privateRoute?.children?.some((child) => child.path === childPath)
      ).toBe(true);
    });
  });

  it("should contain dashboard routes for AdminRoute", () => {
    const adminRoute = routes.find(
      (route) =>
        route.path === "/dashboard" && route.Component.name === "AdminRoute"
    );
    expect(adminRoute).toBeDefined();
    expect(Array.isArray(adminRoute?.children)).toBe(true);
    const adminPaths = [
      "admin",
      "admin/create-category",
      "admin/create-product",
      "admin/product/:slug",
      "admin/products",
      "admin/users",
      "admin/orders",
    ];
    adminPaths.forEach((childPath) => {
      expect(
        adminRoute?.children?.some((child) => child.path === childPath)
      ).toBe(true);
    });
  });

  it("should have a catch-all route for not found pages", () => {
    const notFoundRoute = routes.find((route) => route.path === "*");
    expect(notFoundRoute).toBeDefined();
    expect(notFoundRoute?.Component.name).toBe("Pagenotfound");
  });
});
