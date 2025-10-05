/**
 * Unit tests for relatedProductController
 *
 * Test Coverage:
 * - Parameter validation (pid and cid required)
 * - Database query correctness (filters, limit, select, populate)
 * - Successful response handling
 * - Error handling (no information leakage)
 * - Edge cases
 */

import type { Request, Response } from "express";
import { relatedProductController } from "./productController";
import productModel from "../models/productModel";

jest.mock("../models/productModel");

describe("relatedProductController", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    mockRequest = {
      params: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy.mockRestore();
  });

  describe("Parameter Validation", () => {
    it("should return 400 if pid is missing", async () => {
      mockRequest.params = { cid: "category123" };

      await relatedProductController(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.send).toHaveBeenCalledWith({
        success: false,
        message: "Both pid and cid are required",
      });
    });

    it("should return 400 if cid is missing", async () => {
      mockRequest.params = { pid: "product123" };

      await relatedProductController(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.send).toHaveBeenCalledWith({
        success: false,
        message: "Both pid and cid are required",
      });
    });

    it("should return 400 if both pid and cid are missing", async () => {
      mockRequest.params = {};

      await relatedProductController(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.send).toHaveBeenCalledWith({
        success: false,
        message: "Both pid and cid are required",
      });
    });

    it("should return 400 if pid is empty string", async () => {
      mockRequest.params = { pid: "", cid: "category123" };

      await relatedProductController(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.send).toHaveBeenCalledWith({
        success: false,
        message: "Both pid and cid are required",
      });
    });

    it("should return 400 if cid is empty string", async () => {
      mockRequest.params = { pid: "product123", cid: "" };

      await relatedProductController(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.send).toHaveBeenCalledWith({
        success: false,
        message: "Both pid and cid are required",
      });
    });

    it("should return 400 if params is undefined", async () => {
      mockRequest.params = undefined;

      await relatedProductController(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.send).toHaveBeenCalledWith({
        success: false,
        message: "Both pid and cid are required",
      });
    });

    it("should not call database if validation fails", async () => {
      mockRequest.params = { pid: "", cid: "" };

      await relatedProductController(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(productModel.find).not.toHaveBeenCalled();
    });
  });

  describe("Database Query", () => {
    it("should query products with correct category and exclude current product", async () => {
      const pid = "product123";
      const cid = "category456";
      mockRequest.params = { pid, cid };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue([]),
      };
      (productModel.find as jest.Mock).mockReturnValue(mockQuery);

      await relatedProductController(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(productModel.find).toHaveBeenCalledWith({
        category: cid,
        _id: { $ne: pid },
      });
      expect(productModel.find).toHaveBeenCalledTimes(1);
    });

    it("should exclude photo field from results", async () => {
      mockRequest.params = { pid: "product123", cid: "category456" };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue([]),
      };
      (productModel.find as jest.Mock).mockReturnValue(mockQuery);

      await relatedProductController(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockQuery.select).toHaveBeenCalledWith("-photo");
      expect(mockQuery.select).toHaveBeenCalledTimes(1);
    });

    it("should limit results to 3 products", async () => {
      mockRequest.params = { pid: "product123", cid: "category456" };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue([]),
      };
      (productModel.find as jest.Mock).mockReturnValue(mockQuery);

      await relatedProductController(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockQuery.limit).toHaveBeenCalledWith(3);
      expect(mockQuery.limit).toHaveBeenCalledTimes(1);
    });

    it("should populate category information", async () => {
      mockRequest.params = { pid: "product123", cid: "category456" };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue([]),
      };
      (productModel.find as jest.Mock).mockReturnValue(mockQuery);

      await relatedProductController(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockQuery.populate).toHaveBeenCalledWith("category");
      expect(mockQuery.populate).toHaveBeenCalledTimes(1);
    });

    it("should call query methods in correct order", async () => {
      mockRequest.params = { pid: "product123", cid: "category456" };

      const callOrder: string[] = [];
      const mockQuery = {
        select: jest.fn().mockImplementation(function () {
          callOrder.push("select");
          return this;
        }),
        limit: jest.fn().mockImplementation(function () {
          callOrder.push("limit");
          return this;
        }),
        populate: jest.fn().mockImplementation(() => {
          callOrder.push("populate");
          return Promise.resolve([]);
        }),
      };
      (productModel.find as jest.Mock).mockReturnValue(mockQuery);

      await relatedProductController(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(callOrder).toEqual(["select", "limit", "populate"]);
    });
  });

  describe("Successful Response", () => {
    it("should return 200 with products when found", async () => {
      mockRequest.params = { pid: "product123", cid: "category456" };

      const mockProducts = [
        { _id: "prod1", name: "Related Product 1", category: "category456" },
        { _id: "prod2", name: "Related Product 2", category: "category456" },
        { _id: "prod3", name: "Related Product 3", category: "category456" },
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue(mockProducts),
      };
      (productModel.find as jest.Mock).mockReturnValue(mockQuery);

      await relatedProductController(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.send).toHaveBeenCalledWith({
        success: true,
        products: mockProducts,
      });
    });

    it("should return 200 with empty array when no related products found", async () => {
      mockRequest.params = { pid: "product123", cid: "category456" };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue([]),
      };
      (productModel.find as jest.Mock).mockReturnValue(mockQuery);

      await relatedProductController(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.send).toHaveBeenCalledWith({
        success: true,
        products: [],
      });
    });

    it("should return populated category data with products", async () => {
      mockRequest.params = { pid: "product123", cid: "category456" };

      const mockProducts = [
        {
          _id: "prod1",
          name: "Product 1",
          category: { _id: "category456", name: "Electronics" },
        },
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue(mockProducts),
      };
      (productModel.find as jest.Mock).mockReturnValue(mockQuery);

      await relatedProductController(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.send).toHaveBeenCalledWith({
        success: true,
        products: mockProducts,
      });
      expect(mockProducts[0].category).toHaveProperty("name", "Electronics");
    });

    it("should only call status and send once on success", async () => {
      mockRequest.params = { pid: "product123", cid: "category456" };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue([]),
      };
      (productModel.find as jest.Mock).mockReturnValue(mockQuery);

      await relatedProductController(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledTimes(1);
      expect(mockResponse.send).toHaveBeenCalledTimes(1);
    });
  });

  describe("Error Handling", () => {
    it("should return 500 if database query fails", async () => {
      mockRequest.params = { pid: "product123", cid: "category456" };

      const dbError = new Error("Database connection failed");
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockRejectedValue(dbError),
      };
      (productModel.find as jest.Mock).mockReturnValue(mockQuery);

      await relatedProductController(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.send).toHaveBeenCalledWith({
        success: false,
        message: "Error while getting related products",
      });
    });

    it("should not expose error details to client", async () => {
      mockRequest.params = { pid: "product123", cid: "category456" };

      const dbError = new Error("Sensitive database error with stack trace");
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockRejectedValue(dbError),
      };
      (productModel.find as jest.Mock).mockReturnValue(mockQuery);

      await relatedProductController(
        mockRequest as Request,
        mockResponse as Response
      );

      const sendCall = (mockResponse.send as jest.Mock).mock.calls[0][0];
      expect(sendCall).not.toHaveProperty("error");
      expect(sendCall.message).toBe("Error while getting related products");
    });

    it("should log errors to console.error with descriptive message", async () => {
      mockRequest.params = { pid: "product123", cid: "category456" };

      const dbError = new Error("Database error");
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockRejectedValue(dbError),
      };
      (productModel.find as jest.Mock).mockReturnValue(mockQuery);

      await relatedProductController(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error getting related products:",
        dbError
      );
    });

    it("should handle error during find operation", async () => {
      mockRequest.params = { pid: "product123", cid: "category456" };

      const error = new Error("Find operation failed");
      (productModel.find as jest.Mock).mockImplementation(() => {
        throw error;
      });

      await relatedProductController(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.send).toHaveBeenCalledWith({
        success: false,
        message: "Error while getting related products",
      });
    });

    it("should handle error during select operation", async () => {
      mockRequest.params = { pid: "product123", cid: "category456" };

      const error = new Error("Select operation failed");
      const mockQuery = {
        select: jest.fn().mockImplementation(() => {
          throw error;
        }),
      };
      (productModel.find as jest.Mock).mockReturnValue(mockQuery);

      await relatedProductController(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe("Edge Cases", () => {
    it("should handle special characters in pid and cid", async () => {
      const pid = "product$123";
      const cid = "category@456";
      mockRequest.params = { pid, cid };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue([]),
      };
      (productModel.find as jest.Mock).mockReturnValue(mockQuery);

      await relatedProductController(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(productModel.find).toHaveBeenCalledWith({
        category: cid,
        _id: { $ne: pid },
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it("should handle ObjectId-like strings", async () => {
      const pid = "507f1f77bcf86cd799439011";
      const cid = "507f191e810c19729de860ea";
      mockRequest.params = { pid, cid };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue([]),
      };
      (productModel.find as jest.Mock).mockReturnValue(mockQuery);

      await relatedProductController(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(productModel.find).toHaveBeenCalledWith({
        category: cid,
        _id: { $ne: pid },
      });
    });

    it("should handle whitespace-only pid", async () => {
      mockRequest.params = { pid: "   ", cid: "category123" };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue([]),
      };
      (productModel.find as jest.Mock).mockReturnValue(mockQuery);

      await relatedProductController(
        mockRequest as Request,
        mockResponse as Response
      );

      // Should pass validation (truthy) and call database
      expect(productModel.find).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });
});
