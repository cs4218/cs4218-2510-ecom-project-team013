import { Request, Response } from "express";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import slugify from "slugify";
import { updateCategoryController } from "../controllers/categoryController";
import categoryModel from "../models/categoryModel";

// Mock braintree to avoid initialization errors
jest.mock("braintree", () => {
  return {
    BraintreeGateway: jest.fn().mockImplementation(() => ({})),
    Environment: { Sandbox: "Sandbox", Production: "Production" },
  };
});

const mockRequest = (params = {}, body = {}): Request => {
  return {
    params,
    body,
  } as Request;
};

const mockResponse = () => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

let mongoServer: MongoMemoryServer;
let seededCategories: any[];

const dbConnect = async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
};

const dbDisconnect = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
};

const seedCategories = async () => {
  const categories = await categoryModel.insertMany([
    { name: "Electronics", slug: "electronics" },
    { name: "Books", slug: "books" },
    { name: "Clothing", slug: "clothing" },
  ]);
  return categories;
};

describe("Integration Tests for updateCategoryController", () => {
  beforeAll(async () => {
    await dbConnect();
  });

  beforeEach(async () => {
    seededCategories = await seedCategories();
  });

  afterEach(async () => {
    await categoryModel.deleteMany({});
  });

  afterAll(async () => {
    await dbDisconnect();
  });

  describe("Successful category updates", () => {
    it("should successfully update category name and generate new slug", async () => {
      const categoryId = seededCategories[0]._id.toString();
      const newName = "Consumer Electronics";

      const req = mockRequest({ id: categoryId }, { name: newName });
      const res = mockResponse();

      await updateCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const payload = (res.send as jest.Mock).mock.calls[0][0];
      expect(payload.success).toBe(true);
      expect(payload.message).toBe("Category Updated Successfully");
      expect(payload.category).toBeDefined();
      expect(payload.category.name).toBe(newName);
      expect(payload.category.slug).toBe(slugify(newName, { lower: true }));

      // Verify database was actually updated
      const dbCategory = await categoryModel.findById(categoryId);
      expect(dbCategory?.name).toBe(newName);
      expect(dbCategory?.slug).toBe(slugify(newName, { lower: true }));
    });

    it("should update category with special characters in name", async () => {
      const categoryId = seededCategories[0]._id.toString();
      const newName = "Books & Magazines";

      const req = mockRequest({ id: categoryId }, { name: newName });
      const res = mockResponse();

      await updateCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const payload = (res.send as jest.Mock).mock.calls[0][0];
      expect(payload.success).toBe(true);
      expect(payload.category.name).toBe(newName);
      expect(payload.category.slug).toBe(slugify(newName, { lower: true }));
    });

    it("should update category with unicode characters in name", async () => {
      const categoryId = seededCategories[0]._id.toString();
      const newName = "Électronique";

      const req = mockRequest({ id: categoryId }, { name: newName });
      const res = mockResponse();

      await updateCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const payload = (res.send as jest.Mock).mock.calls[0][0];
      expect(payload.success).toBe(true);
      expect(payload.category.name).toBe(newName);
      expect(payload.category.slug).toBe(slugify(newName, { lower: true }));
    });

    it("should update category with numbers in name", async () => {
      const categoryId = seededCategories[0]._id.toString();
      const newName = "21st Century Electronics";

      const req = mockRequest({ id: categoryId }, { name: newName });
      const res = mockResponse();

      await updateCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const payload = (res.send as jest.Mock).mock.calls[0][0];
      expect(payload.success).toBe(true);
      expect(payload.category.name).toBe(newName);
    });

    it("should trim leading/trailing spaces from category name", async () => {
      const categoryId = seededCategories[0]._id.toString();
      const newName = "  Trimmed Category  ";
      const trimmedName = "Trimmed Category";

      const req = mockRequest({ id: categoryId }, { name: newName });
      const res = mockResponse();

      await updateCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const payload = (res.send as jest.Mock).mock.calls[0][0];
      expect(payload.success).toBe(true);
      // Controller now trims the name
      expect(payload.category.name).toBe(trimmedName);
    });

    it("should return the updated category object with new option", async () => {
      const categoryId = seededCategories[0]._id.toString();
      const newName = "Updated Electronics";

      const req = mockRequest({ id: categoryId }, { name: newName });
      const res = mockResponse();

      await updateCategoryController(req, res);

      const payload = (res.send as jest.Mock).mock.calls[0][0];

      // Verify the returned category is the updated version
      expect(payload.category._id.toString()).toBe(categoryId);
      expect(payload.category.name).toBe(newName);
      expect(payload.category.slug).toBe(slugify(newName, { lower: true }));
    });
  });

  describe("Validation errors", () => {
    it("should return 400 when name is missing", async () => {
      const categoryId = seededCategories[0]._id.toString();
      const req = mockRequest({ id: categoryId }, {});
      const res = mockResponse();

      await updateCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Name is required",
      });

      // Verify database was not modified
      const dbCategory = await categoryModel.findById(categoryId);
      expect(dbCategory?.name).toBe(seededCategories[0].name);
    });

    it("should return 400 when name is null", async () => {
      const categoryId = seededCategories[0]._id.toString();
      const req = mockRequest({ id: categoryId }, { name: null });
      const res = mockResponse();

      await updateCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Name is required",
      });
    });

    it("should return 400 when name is undefined", async () => {
      const categoryId = seededCategories[0]._id.toString();
      const req = mockRequest({ id: categoryId }, { name: undefined });
      const res = mockResponse();

      await updateCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Name is required",
      });
    });

    it("should return 400 when name is empty string", async () => {
      const categoryId = seededCategories[0]._id.toString();
      const req = mockRequest({ id: categoryId }, { name: "" });
      const res = mockResponse();

      await updateCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Name is required",
      });
    });

    it("should return 400 when name is only whitespace", async () => {
      const categoryId = seededCategories[0]._id.toString();
      const req = mockRequest({ id: categoryId }, { name: "   " });
      const res = mockResponse();

      await updateCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Name is required",
      });
    });

    it("should return 400 when category ID is missing", async () => {
      const req = mockRequest({}, { name: "New Name" });
      const res = mockResponse();

      await updateCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Category ID is required",
      });
    });

    it("should return 400 when category ID is empty string", async () => {
      const req = mockRequest({ id: "" }, { name: "New Name" });
      const res = mockResponse();

      await updateCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Category ID is required",
      });
    });
  });

  describe("Category not found", () => {
    it("should return 404 when category does not exist", async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const req = mockRequest({ id: nonExistentId }, { name: "New Name" });
      const res = mockResponse();

      await updateCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Category not found",
      });
    });

    it("should return 404 for deleted category", async () => {
      const categoryId = seededCategories[0]._id.toString();

      // Delete the category
      await categoryModel.findByIdAndDelete(categoryId);

      const req = mockRequest({ id: categoryId }, { name: "New Name" });
      const res = mockResponse();

      await updateCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Category not found",
      });
    });
  });

  describe("Invalid input handling", () => {
    it("should return 500 for invalid ObjectId format", async () => {
      const req = mockRequest(
        { id: "invalid-object-id" },
        { name: "New Name" }
      );
      const res = mockResponse();

      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      await updateCategoryController(req, res);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error updating category:",
        expect.any(Error)
      );
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Error while updating category",
      });

      consoleErrorSpy.mockRestore();
    });

    it("should handle extremely long category names", async () => {
      const categoryId = seededCategories[0]._id.toString();
      const longName = "A".repeat(1000);

      const req = mockRequest({ id: categoryId }, { name: longName });
      const res = mockResponse();

      await updateCategoryController(req, res);

      // Should succeed - no length validation in controller
      expect(res.status).toHaveBeenCalledWith(200);
      const payload = (res.send as jest.Mock).mock.calls[0][0];
      expect(payload.success).toBe(true);
      expect(payload.category.name).toBe(longName);
    });

    it("should handle name with only special characters", async () => {
      const categoryId = seededCategories[0]._id.toString();
      const specialName = "!@#$%^&*()";

      const req = mockRequest({ id: categoryId }, { name: specialName });
      const res = mockResponse();

      await updateCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const payload = (res.send as jest.Mock).mock.calls[0][0];
      expect(payload.success).toBe(true);
      expect(payload.category.name).toBe(specialName);
    });

    it("should reject name as a number with type validation", async () => {
      const categoryId = seededCategories[0]._id.toString();
      const req = mockRequest({ id: categoryId }, { name: 12345 as any });
      const res = mockResponse();

      await updateCategoryController(req, res);

      // Should fail - type validation rejects non-strings
      expect(res.status).toHaveBeenCalledWith(400);
      const payload = (res.send as jest.Mock).mock.calls[0][0];
      expect(payload.success).toBe(false);
      expect(payload.message).toBe("Name must be a string");
    });

    it("should reject name as boolean with type validation", async () => {
      const categoryId = seededCategories[0]._id.toString();
      const req = mockRequest({ id: categoryId }, { name: true as any });
      const res = mockResponse();

      await updateCategoryController(req, res);

      // Should fail - type validation rejects non-strings
      expect(res.status).toHaveBeenCalledWith(400);
      const payload = (res.send as jest.Mock).mock.calls[0][0];
      expect(payload.success).toBe(false);
      expect(payload.message).toBe("Name must be a string");
    });
  });

  describe("Database errors", () => {
    it("should handle database connection errors", async () => {
      const categoryId = seededCategories[0]._id.toString();
      const req = mockRequest({ id: categoryId }, { name: "New Name" });
      const res = mockResponse();

      const categorySpy = jest
        .spyOn(categoryModel, "findByIdAndUpdate")
        .mockRejectedValueOnce(new Error("Database connection failed"));

      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      await updateCategoryController(req, res);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error updating category:",
        expect.any(Error)
      );
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Error while updating category",
      });

      categorySpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it("should handle database timeout errors", async () => {
      const categoryId = seededCategories[0]._id.toString();
      const req = mockRequest({ id: categoryId }, { name: "New Name" });
      const res = mockResponse();

      const categorySpy = jest
        .spyOn(categoryModel, "findByIdAndUpdate")
        .mockRejectedValueOnce(new Error("Operation timed out"));

      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      await updateCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Error while updating category",
      });

      categorySpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });

  describe("Slug generation", () => {
    it("should generate slug in lowercase", async () => {
      const categoryId = seededCategories[0]._id.toString();
      const newName = "UPPERCASE CATEGORY";

      const req = mockRequest({ id: categoryId }, { name: newName });
      const res = mockResponse();

      await updateCategoryController(req, res);

      const payload = (res.send as jest.Mock).mock.calls[0][0];
      expect(payload.category.slug).toBe(slugify(newName, { lower: true }));
      expect(payload.category.slug).toBe(payload.category.slug.toLowerCase());
    });

    it("should replace spaces with hyphens in slug", async () => {
      const categoryId = seededCategories[0]._id.toString();
      const newName = "Multi Word Category";

      const req = mockRequest({ id: categoryId }, { name: newName });
      const res = mockResponse();

      await updateCategoryController(req, res);

      const payload = (res.send as jest.Mock).mock.calls[0][0];
      expect(payload.category.slug).toContain("-");
      expect(payload.category.slug).not.toContain(" ");
    });

    it("should handle slug generation for names with hyphens", async () => {
      const categoryId = seededCategories[0]._id.toString();
      const newName = "Pre-Owned Items";

      const req = mockRequest({ id: categoryId }, { name: newName });
      const res = mockResponse();

      await updateCategoryController(req, res);

      const payload = (res.send as jest.Mock).mock.calls[0][0];
      expect(payload.category.slug).toBe(slugify(newName, { lower: true }));
    });
  });

  describe("Concurrency and race conditions", () => {
    it("should handle multiple simultaneous updates to different categories", async () => {
      const req1 = mockRequest(
        { id: seededCategories[0]._id.toString() },
        { name: "Updated Electronics" }
      );
      const req2 = mockRequest(
        { id: seededCategories[1]._id.toString() },
        { name: "Updated Books" }
      );
      const res1 = mockResponse();
      const res2 = mockResponse();

      await Promise.all([
        updateCategoryController(req1, res1),
        updateCategoryController(req2, res2),
      ]);

      expect(res1.status).toHaveBeenCalledWith(200);
      expect(res2.status).toHaveBeenCalledWith(200);

      const payload1 = (res1.send as jest.Mock).mock.calls[0][0];
      const payload2 = (res2.send as jest.Mock).mock.calls[0][0];

      expect(payload1.category.name).toBe("Updated Electronics");
      expect(payload2.category.name).toBe("Updated Books");

      // Verify both updates persisted
      const dbCategory1 = await categoryModel.findById(seededCategories[0]._id);
      const dbCategory2 = await categoryModel.findById(seededCategories[1]._id);

      expect(dbCategory1?.name).toBe("Updated Electronics");
      expect(dbCategory2?.name).toBe("Updated Books");
    });

    it("should handle concurrent updates to the same category (last write wins)", async () => {
      const categoryId = seededCategories[0]._id.toString();

      const req1 = mockRequest({ id: categoryId }, { name: "Update One" });
      const req2 = mockRequest({ id: categoryId }, { name: "Update Two" });
      const res1 = mockResponse();
      const res2 = mockResponse();

      await Promise.all([
        updateCategoryController(req1, res1),
        updateCategoryController(req2, res2),
      ]);

      // Both should succeed
      expect(res1.status).toHaveBeenCalledWith(200);
      expect(res2.status).toHaveBeenCalledWith(200);

      // Verify final state in database (one of the updates should win)
      const dbCategory = await categoryModel.findById(categoryId);
      expect(
        dbCategory?.name === "Update One" || dbCategory?.name === "Update Two"
      ).toBe(true);
    });
  });

  describe("Data integrity", () => {
    it("should not modify other category fields during update", async () => {
      const categoryId = seededCategories[0]._id.toString();
      const originalCategory = await categoryModel.findById(categoryId);

      const req = mockRequest({ id: categoryId }, { name: "New Name" });
      const res = mockResponse();

      await updateCategoryController(req, res);

      const updatedCategory = await categoryModel.findById(categoryId);

      // Only name and slug should change
      expect(updatedCategory?._id.toString()).toBe(
        originalCategory?._id.toString()
      );
      expect(updatedCategory?.name).not.toBe(originalCategory?.name);
      expect(updatedCategory?.slug).not.toBe(originalCategory?.slug);
    });

    it("should not affect other categories in database", async () => {
      const targetCategoryId = seededCategories[0]._id.toString();
      const otherCategoryId = seededCategories[1]._id.toString();

      const otherCategoryBefore = await categoryModel.findById(otherCategoryId);

      const req = mockRequest(
        { id: targetCategoryId },
        { name: "Updated Target" }
      );
      const res = mockResponse();

      await updateCategoryController(req, res);

      const otherCategoryAfter = await categoryModel.findById(otherCategoryId);

      // Other category should remain unchanged
      expect(otherCategoryAfter?.name).toBe(otherCategoryBefore?.name);
      expect(otherCategoryAfter?.slug).toBe(otherCategoryBefore?.slug);
    });

    it("should maintain database consistency on error", async () => {
      const categoryId = seededCategories[0]._id.toString();
      const originalName = seededCategories[0].name;

      const req = mockRequest({ id: categoryId }, { name: "New Name" });
      const res = mockResponse();

      // Force an error after validation but during update
      const categorySpy = jest
        .spyOn(categoryModel, "findByIdAndUpdate")
        .mockRejectedValueOnce(new Error("Simulated error"));

      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      await updateCategoryController(req, res);

      // Verify original data is preserved
      const dbCategory = await categoryModel.findById(categoryId);
      expect(dbCategory?.name).toBe(originalName);

      categorySpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });

  describe("Response format", () => {
    it("should return correct response structure on success", async () => {
      const categoryId = seededCategories[0]._id.toString();
      const req = mockRequest({ id: categoryId }, { name: "New Name" });
      const res = mockResponse();

      await updateCategoryController(req, res);

      const payload = (res.send as jest.Mock).mock.calls[0][0];

      expect(payload).toHaveProperty("success");
      expect(payload).toHaveProperty("message");
      expect(payload).toHaveProperty("category");
      expect(payload.success).toBe(true);
      expect(typeof payload.message).toBe("string");
      expect(typeof payload.category).toBe("object");
    });

    it("should return correct response structure on validation error", async () => {
      const req = mockRequest({ id: seededCategories[0]._id.toString() }, {});
      const res = mockResponse();

      await updateCategoryController(req, res);

      const payload = (res.send as jest.Mock).mock.calls[0][0];

      expect(payload).toHaveProperty("success");
      expect(payload).toHaveProperty("message");
      expect(payload.success).toBe(false);
      expect(typeof payload.message).toBe("string");
    });

    it("should return correct response structure on not found error", async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const req = mockRequest({ id: nonExistentId }, { name: "New Name" });
      const res = mockResponse();

      await updateCategoryController(req, res);

      const payload = (res.send as jest.Mock).mock.calls[0][0];

      expect(payload).toHaveProperty("success");
      expect(payload).toHaveProperty("message");
      expect(payload.success).toBe(false);
      expect(payload.message).toBe("Category not found");
    });
  });
});
