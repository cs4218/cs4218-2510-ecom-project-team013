import express, { Express } from "express";
import request from "supertest";
import * as categoryController from "../controllers/categoryController";
import * as authMiddleware from "../middlewares/authMiddleware";
import router from "../routes/categoryRoutes";

jest.mock("../controllers/categoryController");
jest.mock("../middlewares/authMiddleware");

const mockRequireSignIn = authMiddleware.requireSignIn as jest.Mock;
const mockIsAdmin = authMiddleware.isAdmin as jest.Mock;

describe("categoryRoutes", () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use("/api", router);

    jest.clearAllMocks();

    mockRequireSignIn.mockImplementation((req, res, next) => next());
    mockIsAdmin.mockImplementation((req, res, next) => next());
  });

  describe("POST /create-category", () => {
    it("should call createCategoryController with requireSignIn and isAdmin", async () => {
      (
        categoryController.createCategoryController as jest.Mock
      ).mockImplementation((req, res) =>
        res.status(201).json({ msg: "created" })
      );
      const res = await request(app)
        .post("/api/create-category")
        .send({ name: "Electronics" });
      expect(res.status).toBe(201);
      expect(res.body).toEqual({ msg: "created" });
      expect(mockRequireSignIn).toHaveBeenCalled();
      expect(mockIsAdmin).toHaveBeenCalled();
      expect(categoryController.createCategoryController).toHaveBeenCalled();
    });
  });

  describe("PUT /update-category/:id", () => {
    it("should call updateCategoryController with requireSignIn and isAdmin", async () => {
      (
        categoryController.updateCategoryController as jest.Mock
      ).mockImplementation((req, res) =>
        res.status(200).json({ updated: true })
      );
      const res = await request(app)
        .put("/api/update-category/123")
        .send({ name: "New Name" });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ updated: true });
      expect(mockRequireSignIn).toHaveBeenCalled();
      expect(mockIsAdmin).toHaveBeenCalled();
      expect(categoryController.updateCategoryController).toHaveBeenCalled();
    });
  });

  describe("GET /get-category", () => {
    it("should call categoryController", async () => {
      (categoryController.categoryController as jest.Mock).mockImplementation(
        (req, res) => res.status(200).json({ categories: [] })
      );
      const res = await request(app).get("/api/get-category");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ categories: [] });
      expect(categoryController.categoryController).toHaveBeenCalled();
    });
  });

  describe("GET /single-category/:slug", () => {
    it("should call singleCategoryController", async () => {
      (
        categoryController.singleCategoryController as jest.Mock
      ).mockImplementation((req, res) =>
        res.status(200).json({ category: { slug: req.params.slug } })
      );
      const res = await request(app).get("/api/single-category/test-slug");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ category: { slug: "test-slug" } });
      expect(categoryController.singleCategoryController).toHaveBeenCalled();
    });
  });

  describe("DELETE /delete-category/:id", () => {
    it("should call deleteCategoryController with requireSignIn and isAdmin", async () => {
      (
        categoryController.deleteCategoryController as jest.Mock
      ).mockImplementation((req, res) =>
        res.status(200).json({ deleted: true })
      );
      const res = await request(app).delete("/api/delete-category/123");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ deleted: true });
      expect(mockRequireSignIn).toHaveBeenCalled();
      expect(mockIsAdmin).toHaveBeenCalled();
      expect(categoryController.deleteCategoryController).toHaveBeenCalled();
    });
  });
});
