import { Router } from "express";
import {
  forgotPasswordController,
  getAllOrdersController,
  getOrdersController,
  loginController,
  orderStatusController,
  registerController,
  testController,
  updateProfileController,
} from "../controllers/authController";
import { isAdmin, requireSignIn } from "../middlewares/authMiddleware";

const router = Router()
  // REGISTER || METHOD POST
  .post("/register", registerController)
  // LOGIN || POST
  .post("/login", loginController)
  // Forgot Password || POST
  .post("/forgot-password", forgotPasswordController)
  // Test routes
  .get("/test", requireSignIn, isAdmin, testController)
  // Protected User route auth
  .get("/user-auth", requireSignIn, (req, res) => {
    res.status(200).send({ ok: true });
  })
  // Protected Admin route auth
  .get("/admin-auth", requireSignIn, isAdmin, (req, res) => {
    res.status(200).send({ ok: true });
  })
  // Update profile
  .put("/profile", requireSignIn, updateProfileController)
  // Orders
  .get("/orders", requireSignIn, getOrdersController)
  // All orders
  .get("/all-orders", requireSignIn, isAdmin, getAllOrdersController)
  // Order status update
  .put("/order-status/:orderId", requireSignIn, isAdmin, orderStatusController);

export default router;
