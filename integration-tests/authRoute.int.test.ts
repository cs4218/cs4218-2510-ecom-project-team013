import express, { Express } from "express";
import request from "supertest";
import * as authController from "../controllers/authController";
import * as authMiddleware from "../middlewares/authMiddleware";
import router from "../routes/authRoute";

jest.mock("../controllers/authController");
jest.mock("../middlewares/authMiddleware");

const mockRequireSignIn = authMiddleware.requireSignIn as jest.Mock;
const mockIsAdmin = authMiddleware.isAdmin as jest.Mock;

describe("authRoute", () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use("/api", router);

    // Reset all mocks before each test
    jest.clearAllMocks();

    // By default, middlewares call next()
    mockRequireSignIn.mockImplementation((req, res, next) => next());
    mockIsAdmin.mockImplementation((req, res, next) => next());
  });

  describe("POST /register", () => {
    it("should call registerController", async () => {
      (authController.registerController as jest.Mock).mockImplementation(
        (req, res) => res.status(201).json({ msg: "registered" })
      );
      const res = await request(app)
        .post("/api/register")
        .send({ email: "test@test.com", password: "123456" });
      expect(res.status).toBe(201);
      expect(res.body).toEqual({ msg: "registered" });
      expect(authController.registerController).toHaveBeenCalled();
    });
  });

  describe("POST /login", () => {
    it("should call loginController", async () => {
      (authController.loginController as jest.Mock).mockImplementation(
        (req, res) => res.status(200).json({ token: "abc" })
      );
      const res = await request(app)
        .post("/api/login")
        .send({ email: "test@test.com", password: "123456" });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ token: "abc" });
      expect(authController.loginController).toHaveBeenCalled();
    });
  });

  describe("POST /forgot-password", () => {
    it("should call forgotPasswordController", async () => {
      (authController.forgotPasswordController as jest.Mock).mockImplementation(
        (req, res) => res.status(200).json({ msg: "email sent" })
      );
      const res = await request(app)
        .post("/api/forgot-password")
        .send({ email: "test@test.com" });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ msg: "email sent" });
      expect(authController.forgotPasswordController).toHaveBeenCalled();
    });
  });

  describe("GET /test", () => {
    it("should call requireSignIn, isAdmin, and testController", async () => {
      (authController.testController as jest.Mock).mockImplementation(
        (req, res) => res.status(200).json({ ok: true })
      );
      const res = await request(app).get("/api/test");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });
      expect(mockRequireSignIn).toHaveBeenCalled();
      expect(mockIsAdmin).toHaveBeenCalled();
      expect(authController.testController).toHaveBeenCalled();
    });
  });

  describe("GET /user-auth", () => {
    it("should call requireSignIn and return ok", async () => {
      const res = await request(app).get("/api/user-auth");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });
      expect(mockRequireSignIn).toHaveBeenCalled();
    });
  });

  describe("GET /admin-auth", () => {
    it("should call requireSignIn, isAdmin and return ok", async () => {
      const res = await request(app).get("/api/admin-auth");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });
      expect(mockRequireSignIn).toHaveBeenCalled();
      expect(mockIsAdmin).toHaveBeenCalled();
    });
  });

  describe("PUT /profile", () => {
    it("should call requireSignIn and updateProfileController", async () => {
      (authController.updateProfileController as jest.Mock).mockImplementation(
        (req, res) => res.status(200).json({ updated: true })
      );
      const res = await request(app)
        .put("/api/profile")
        .send({ name: "New Name" });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ updated: true });
      expect(mockRequireSignIn).toHaveBeenCalled();
      expect(authController.updateProfileController).toHaveBeenCalled();
    });
  });

  describe("GET /orders", () => {
    it("should call requireSignIn and getOrdersController", async () => {
      (authController.getOrdersController as jest.Mock).mockImplementation(
        (req, res) => res.status(200).json({ orders: [] })
      );
      const res = await request(app).get("/api/orders");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ orders: [] });
      expect(mockRequireSignIn).toHaveBeenCalled();
      expect(authController.getOrdersController).toHaveBeenCalled();
    });
  });

  describe("GET /all-orders", () => {
    it("should call requireSignIn, isAdmin and getAllOrdersController", async () => {
      (authController.getAllOrdersController as jest.Mock).mockImplementation(
        (req, res) => res.status(200).json({ orders: ["order1"] })
      );
      const res = await request(app).get("/api/all-orders");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ orders: ["order1"] });
      expect(mockRequireSignIn).toHaveBeenCalled();
      expect(mockIsAdmin).toHaveBeenCalled();
      expect(authController.getAllOrdersController).toHaveBeenCalled();
    });
  });

  describe("PUT /order-status/:orderId", () => {
    it("should call requireSignIn, isAdmin and orderStatusController", async () => {
      (authController.orderStatusController as jest.Mock).mockImplementation(
        (req, res) => res.status(200).json({ status: "updated" })
      );
      const res = await request(app)
        .put("/api/order-status/123")
        .send({ status: "shipped" });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: "updated" });
      expect(mockRequireSignIn).toHaveBeenCalled();
      expect(mockIsAdmin).toHaveBeenCalled();
      expect(authController.orderStatusController).toHaveBeenCalled();
    });
  });
});
