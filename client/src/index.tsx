import "antd/dist/reset.css";
import { createRoot } from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./context/auth";
import { CartProvider } from "./context/cart";
import { SearchProvider } from "./context/search";
import "./index.css";
import reportWebVitals from "./reportWebVitals";

const root = document.getElementById("root")!;
createRoot(root).render(
  <AuthProvider>
    <SearchProvider>
      <CartProvider>
        <App />
      </CartProvider>
    </SearchProvider>
  </AuthProvider>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
