import type { RouteObject } from "react-router-dom";
import AdminRoute from "./components/Routes/AdminRoute";
import PrivateRoute from "./components/Routes/Private";
import About from "./pages/About";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminOrders from "./pages/admin/AdminOrders";
import CreateCategory from "./pages/admin/CreateCategory";
import CreateProduct from "./pages/admin/CreateProduct";
import Products from "./pages/admin/Products";
import UpdateProduct from "./pages/admin/UpdateProduct";
import Users from "./pages/admin/Users";
import Login from "./pages/Auth/Login";
import Register from "./pages/Auth/Register";
import CartPage from "./pages/CartPage";
import Categories from "./pages/Categories";
import CategoryProduct from "./pages/CategoryProduct";
import Contact from "./pages/Contact";
import HomePage from "./pages/HomePage";
import Pagenotfound from "./pages/Pagenotfound";
import Policy from "./pages/Policy";
import ProductDetails from "./pages/ProductDetails";
import Search from "./pages/Search";
import Dashboard from "./pages/user/Dashboard";
import Orders from "./pages/user/Orders";
import Profile from "./pages/user/Profile";

const routes = [
  { path: "/", Component: HomePage },
  { path: "/product/:slug", Component: ProductDetails },
  { path: "/categories", Component: Categories },
  { path: "/cart", Component: CartPage },
  { path: "/category/:slug", Component: CategoryProduct },
  { path: "/search", Component: Search },
  {
    path: "/dashboard",
    Component: PrivateRoute,
    children: [
      { path: "user", Component: Dashboard },
      { path: "user/orders", Component: Orders },
      { path: "user/profile", Component: Profile },
    ],
  },
  {
    path: "/dashboard",
    Component: AdminRoute,
    children: [
      { path: "admin", Component: AdminDashboard },
      { path: "admin/create-category", Component: CreateCategory },
      { path: "admin/create-product", Component: CreateProduct },
      { path: "admin/product/:slug", Component: UpdateProduct },
      { path: "admin/products", Component: Products },
      { path: "admin/users", Component: Users },
      { path: "admin/orders", Component: AdminOrders },
    ],
  },
  { path: "/register", Component: Register },
  { path: "/login", Component: Login },
  { path: "/about", Component: About },
  { path: "/contact", Component: Contact },
  { path: "/policy", Component: Policy },
  { path: "*", Component: Pagenotfound },
] satisfies RouteObject[];

export default routes;
