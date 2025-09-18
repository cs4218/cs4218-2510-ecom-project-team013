import type { Request, Response } from "express";
import orderModel from "../models/orderModel";
import { getAllOrdersController, getOrdersController } from "./authController";

jest.mock("../models/orderModel");

const mockResponse = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnThis();
  res.send = jest.fn().mockReturnThis();
  res.json = jest.fn().mockReturnThis();
  return res as Response;
};

describe("Auth Controllers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getOrdersController", () => {
    it("should get orders", async () => {
      (orderModel.find as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([{ id: 1 }]),
      });
      const req = { user: { _id: "1" } } as any;
      const res = mockResponse();
      await getOrdersController(req, res);
      expect(res.json).toHaveBeenCalledWith([{ id: 1 }]);
    });

    it("should handle errors", async () => {
      (orderModel.find as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error("DB Error")),
      });
      expect.assertions(2);
      const req = { user: { _id: "1" } } as any;
      const res = mockResponse();
      await getOrdersController(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error WHile Geting Orders",
        })
      );
    });
  });

  describe("getAllOrdersController", () => {
    it("should get all orders", async () => {
      (orderModel.find as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([{ id: 1 }]),
      });
      const req = {} as Request;
      const res = mockResponse();
      await getAllOrdersController(req, res);
      expect(res.json).toHaveBeenCalledWith([{ id: 1 }]);
    });

    it("should handle errors", async () => {
      (orderModel.find as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error("DB Error")),
      });
      expect.assertions(2);
      const req = {} as Request;
      const res = mockResponse();
      await getAllOrdersController(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error WHile Geting Orders",
        })
      );
    });
  });
});
