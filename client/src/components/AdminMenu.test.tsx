import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminMenu from "./AdminMenu";

// Helper function to render component with router
const renderWithRouter = (initialRoute = "/") => {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <AdminMenu />
    </MemoryRouter>
  );
};

describe("AdminMenu Component", () => {
  describe("Component Rendering", () => {
    it("renders without crashing", () => {
      renderWithRouter();
      expect(screen.getByText("Admin Panel")).toBeInTheDocument();
    });

    it("renders the admin panel heading", () => {
      renderWithRouter();
      const heading = screen.getByRole("heading", { name: /admin panel/i });
      expect(heading).toBeInTheDocument();
      expect(heading.tagName).toBe("H4");
    });

    it("renders within a centered text container", () => {
      const { container } = renderWithRouter();
      const centerDiv = container.querySelector(".text-center");
      expect(centerDiv).toBeInTheDocument();
    });

    it("renders dashboard menu container", () => {
      const { container } = renderWithRouter();
      const dashboardMenu = container.querySelector(".dashboard-menu");
      expect(dashboardMenu).toBeInTheDocument();
      expect(dashboardMenu?.classList.contains("list-group")).toBe(true);
    });
  });

  describe("Navigation Links", () => {
    it("renders all navigation links", () => {
      renderWithRouter();

      expect(screen.getByText("Create Category")).toBeInTheDocument();
      expect(screen.getByText("Create Product")).toBeInTheDocument();
      expect(screen.getByText("Products")).toBeInTheDocument();
      expect(screen.getByText("Orders")).toBeInTheDocument();
    });

    it("renders Create Category link with correct attributes", () => {
      renderWithRouter();
      const link = screen.getByText("Create Category").closest("a");

      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "/dashboard/admin/create-category");
      expect(link?.classList.contains("list-group-item")).toBe(true);
      expect(link?.classList.contains("list-group-item-action")).toBe(true);
    });

    it("renders Create Product link with correct attributes", () => {
      renderWithRouter();
      const link = screen.getByText("Create Product").closest("a");

      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "/dashboard/admin/create-product");
      expect(link?.classList.contains("list-group-item")).toBe(true);
      expect(link?.classList.contains("list-group-item-action")).toBe(true);
    });

    it("renders Products link with correct attributes", () => {
      renderWithRouter();
      const link = screen.getByText("Products").closest("a");

      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "/dashboard/admin/products");
      expect(link?.classList.contains("list-group-item")).toBe(true);
      expect(link?.classList.contains("list-group-item-action")).toBe(true);
    });

    it("renders Orders link with correct attributes", () => {
      renderWithRouter();
      const link = screen.getByText("Orders").closest("a");

      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "/dashboard/admin/orders");
      expect(link?.classList.contains("list-group-item")).toBe(true);
      expect(link?.classList.contains("list-group-item-action")).toBe(true);
    });

    it("renders exactly 4 navigation links", () => {
      renderWithRouter();
      const links = screen
        .getAllByRole("link")
        .filter((link) => link.classList.contains("list-group-item"));

      expect(links).toHaveLength(4);
    });

    it("does not render Users link (commented out)", () => {
      renderWithRouter();
      expect(screen.queryByText("Users")).not.toBeInTheDocument();
    });
  });

  describe("NavLink Active State", () => {
    it("applies active class when on Create Category route", () => {
      renderWithRouter("/dashboard/admin/create-category");
      const link = screen.getByText("Create Category").closest("a");

      expect(link?.classList.contains("active")).toBe(true);
    });

    it("applies active class when on Create Product route", () => {
      renderWithRouter("/dashboard/admin/create-product");
      const link = screen.getByText("Create Product").closest("a");

      expect(link?.classList.contains("active")).toBe(true);
    });

    it("applies active class when on Products route", () => {
      renderWithRouter("/dashboard/admin/products");
      const link = screen.getByText("Products").closest("a");

      expect(link?.classList.contains("active")).toBe(true);
    });

    it("applies active class when on Orders route", () => {
      renderWithRouter("/dashboard/admin/orders");
      const link = screen.getByText("Orders").closest("a");

      expect(link?.classList.contains("active")).toBe(true);
    });

    it("only one link is active at a time", () => {
      renderWithRouter("/dashboard/admin/create-category");
      const activeLinks = screen
        .getAllByRole("link")
        .filter((link) => link.classList.contains("active"));

      expect(activeLinks).toHaveLength(1);
      expect(activeLinks[0]).toHaveTextContent("Create Category");
    });

    it("no link is active on non-matching route", () => {
      renderWithRouter("/dashboard/admin/settings");
      const links = screen.getAllByRole("link");
      const activeLinks = links.filter((link) =>
        link.classList.contains("active")
      );

      expect(activeLinks).toHaveLength(0);
    });
  });

  describe("Link Order and Structure", () => {
    it("renders links in correct order", () => {
      renderWithRouter();
      const links = screen
        .getAllByRole("link")
        .filter((link) => link.classList.contains("list-group-item"));

      expect(links[0]).toHaveTextContent("Create Category");
      expect(links[1]).toHaveTextContent("Create Product");
      expect(links[2]).toHaveTextContent("Products");
      expect(links[3]).toHaveTextContent("Orders");
    });

    it("all links have list-group-item class", () => {
      renderWithRouter();
      const links = screen
        .getAllByRole("link")
        .filter((link) => link.classList.contains("list-group-item"));

      links.forEach((link) => {
        expect(link.classList.contains("list-group-item")).toBe(true);
      });
    });

    it("all links have list-group-item-action class", () => {
      renderWithRouter();
      const links = screen
        .getAllByRole("link")
        .filter((link) => link.classList.contains("list-group-item"));

      links.forEach((link) => {
        expect(link.classList.contains("list-group-item-action")).toBe(true);
      });
    });
  });

  describe("Accessibility", () => {
    it("renders all links with role='link'", () => {
      renderWithRouter();
      const menuLinks = screen
        .getAllByRole("link")
        .filter((link) => link.classList.contains("list-group-item"));

      expect(menuLinks).toHaveLength(4);
      menuLinks.forEach((link) => {
        expect(link).toHaveAttribute("href");
      });
    });

    it("renders heading with correct semantic level", () => {
      renderWithRouter();
      const heading = screen.getByRole("heading", { level: 4 });
      expect(heading).toHaveTextContent("Admin Panel");
    });

    it("all links have accessible text", () => {
      renderWithRouter();
      const links = screen
        .getAllByRole("link")
        .filter((link) => link.classList.contains("list-group-item"));

      links.forEach((link) => {
        expect(link.textContent).toBeTruthy();
        expect(link.textContent?.trim().length).toBeGreaterThan(0);
      });
    });
  });

  describe("Edge Cases", () => {
    it("handles multiple renders without errors", () => {
      const { rerender } = renderWithRouter();
      expect(screen.getByText("Admin Panel")).toBeInTheDocument();

      rerender(
        <MemoryRouter>
          <AdminMenu />
        </MemoryRouter>
      );
      expect(screen.getByText("Admin Panel")).toBeInTheDocument();
    });

    it("maintains component structure on re-render", () => {
      const { container, rerender } = renderWithRouter();
      const initialHTML = container.innerHTML;

      rerender(
        <MemoryRouter>
          <AdminMenu />
        </MemoryRouter>
      );

      expect(container.innerHTML).toBe(initialHTML);
    });

    it("renders correctly when router is at root path", () => {
      renderWithRouter("/");
      expect(screen.getByText("Admin Panel")).toBeInTheDocument();
      expect(screen.getAllByRole("link")).toHaveLength(4);
    });

    it("renders correctly when router is at nested path", () => {
      renderWithRouter("/dashboard/admin/create-category/new");
      expect(screen.getByText("Admin Panel")).toBeInTheDocument();
      expect(screen.getAllByRole("link")).toHaveLength(4);
    });

    it("does not break with special characters in URL", () => {
      renderWithRouter("/dashboard/admin/orders?filter=pending&sort=date");
      expect(screen.getByText("Orders").closest("a")).toHaveAttribute(
        "href",
        "/dashboard/admin/orders"
      );
    });
  });

  describe("Component Isolation", () => {
    it("does not depend on external state", () => {
      const { container: container1 } = renderWithRouter();
      const { container: container2 } = renderWithRouter();

      expect(container1.innerHTML).toBe(container2.innerHTML);
    });

    it("is a pure component (same props = same output)", () => {
      const { container: firstRender } = render(
        <MemoryRouter>
          <AdminMenu />
        </MemoryRouter>
      );

      const { container: secondRender } = render(
        <MemoryRouter>
          <AdminMenu />
        </MemoryRouter>
      );

      expect(firstRender.innerHTML).toBe(secondRender.innerHTML);
    });
  });
});
