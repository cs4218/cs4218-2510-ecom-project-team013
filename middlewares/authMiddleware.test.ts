import type { Request, Response } from "express";
import JWT from "jsonwebtoken";
import { isAdmin, requireSignIn } from "./authMiddleware";
import userModel from "../models/userModel";

jest.mock("jsonwebtoken");
jest.mock("../models/userModel");

describe("authMiddleware", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    mockRequest = {
      headers: {},
      user: undefined,
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy.mockRestore();
  });

  describe("requireSignIn", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv, JWT_SECRET: "test-secret" };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    describe("Configuration Validation", () => {
      it("should return 500 if JWT_SECRET is not configured", async () => {
        delete process.env.JWT_SECRET;

        await requireSignIn(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.send).toHaveBeenCalledWith({
          success: false,
          message: "Server configuration error",
        });
        expect(mockNext).not.toHaveBeenCalled();
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "JWT_SECRET is not configured"
        );
      });
    });

    describe("Authorization Header Validation", () => {
      it("should return 401 if authorization header is missing", async () => {
        await requireSignIn(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.send).toHaveBeenCalledWith({
          success: false,
          message: "Authorization token required",
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it("should return 401 if authorization header is empty string", async () => {
        mockRequest.headers = { authorization: "" };

        await requireSignIn(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.send).toHaveBeenCalledWith({
          success: false,
          message: "Authorization token required",
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it("should return 401 if token is only whitespace", async () => {
        mockRequest.headers = { authorization: "   " };

        await requireSignIn(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.send).toHaveBeenCalledWith({
          success: false,
          message: "Invalid authorization token",
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it("should return 401 if Bearer prefix without token", async () => {
        mockRequest.headers = { authorization: "Bearer " };

        await requireSignIn(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.send).toHaveBeenCalledWith({
          success: false,
          message: "Invalid authorization token",
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it("should return 401 if Bearer prefix with only whitespace", async () => {
        mockRequest.headers = { authorization: "Bearer    " };

        await requireSignIn(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.send).toHaveBeenCalledWith({
          success: false,
          message: "Invalid authorization token",
        });
        expect(mockNext).not.toHaveBeenCalled();
      });
    });

    describe("Token Format Support", () => {
      it("should accept token with Bearer prefix", async () => {
        const token = "valid-jwt-token";
        const decoded = { _id: "user123", iat: 1234567890, exp: 1234567890 };
        mockRequest.headers = { authorization: `Bearer ${token}` };
        (JWT.verify as jest.Mock).mockReturnValue(decoded);

        await requireSignIn(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(JWT.verify).toHaveBeenCalledWith(token, "test-secret");
        expect(mockRequest.user).toEqual(decoded);
        expect(mockNext).toHaveBeenCalled();
        expect(mockResponse.status).not.toHaveBeenCalled();
      });

      it("should accept plain token without Bearer prefix", async () => {
        const token = "valid-jwt-token";
        const decoded = { _id: "user123", iat: 1234567890 };
        mockRequest.headers = { authorization: token };
        (JWT.verify as jest.Mock).mockReturnValue(decoded);

        await requireSignIn(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(JWT.verify).toHaveBeenCalledWith(token, "test-secret");
        expect(mockRequest.user).toEqual(decoded);
        expect(mockNext).toHaveBeenCalled();
        expect(mockResponse.status).not.toHaveBeenCalled();
      });

      it("should handle Bearer prefix case-sensitively (bearer should not work)", async () => {
        mockRequest.headers = { authorization: "bearer token123" };
        (JWT.verify as jest.Mock).mockReturnValue({ _id: "user123" });

        await requireSignIn(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(JWT.verify).toHaveBeenCalledWith(
          "bearer token123",
          "test-secret"
        );
        expect(mockNext).toHaveBeenCalled();
      });
    });

    describe("Token Verification", () => {
      it("should successfully verify valid token and call next()", async () => {
        const token = "valid-token";
        const decoded = { _id: "user123" };
        mockRequest.headers = { authorization: token };
        (JWT.verify as jest.Mock).mockReturnValue(decoded);

        await requireSignIn(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(JWT.verify).toHaveBeenCalledWith(token, "test-secret");
        expect(mockRequest.user).toEqual(decoded);
        expect(mockNext).toHaveBeenCalled();
        expect(mockResponse.status).not.toHaveBeenCalled();
      });

      it("should return 401 if decoded token is null", async () => {
        mockRequest.headers = { authorization: "token" };
        (JWT.verify as jest.Mock).mockReturnValue(null);

        await requireSignIn(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.send).toHaveBeenCalledWith({
          success: false,
          message: "Invalid token payload",
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it("should return 401 if decoded token has no _id", async () => {
        mockRequest.headers = { authorization: "token" };
        (JWT.verify as jest.Mock).mockReturnValue({ iat: 123456 });

        await requireSignIn(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.send).toHaveBeenCalledWith({
          success: false,
          message: "Invalid token payload",
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it("should return 401 if decoded token has empty _id", async () => {
        mockRequest.headers = { authorization: "token" };
        (JWT.verify as jest.Mock).mockReturnValue({ _id: "" });

        await requireSignIn(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.send).toHaveBeenCalledWith({
          success: false,
          message: "Invalid token payload",
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it("should verify JWT with correct secret", async () => {
        const token = "test-jwt-token";
        const secret = "test-secret";
        mockRequest.headers = { authorization: token };
        (JWT.verify as jest.Mock).mockReturnValue({ _id: "user123" });

        await requireSignIn(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(JWT.verify).toHaveBeenCalledWith(token, secret);
        expect(JWT.verify).toHaveBeenCalledTimes(1);
      });
    });

    describe("JWT Error Handling", () => {
      it("should return 401 for JsonWebTokenError", async () => {
        mockRequest.headers = { authorization: "invalid-token" };
        (JWT.verify as jest.Mock).mockImplementation(() => {
          throw new JWT.JsonWebTokenError("jwt malformed");
        });

        await requireSignIn(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.send).toHaveBeenCalledWith({
          success: false,
          message: "Invalid token",
        });
        expect(mockNext).not.toHaveBeenCalled();
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      it("should return 401 for TokenExpiredError", async () => {
        mockRequest.headers = { authorization: "expired-token" };
        const expiredError = new JWT.TokenExpiredError(
          "jwt expired",
          new Date()
        );
        (JWT.verify as jest.Mock).mockImplementation(() => {
          throw expiredError;
        });

        await requireSignIn(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.send).toHaveBeenCalledWith({
          success: false,
          message: "Token expired",
        });
        expect(mockNext).not.toHaveBeenCalled();
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      it("should return 401 for generic errors", async () => {
        mockRequest.headers = { authorization: "token" };
        (JWT.verify as jest.Mock).mockImplementation(() => {
          throw new Error("Unknown error");
        });

        await requireSignIn(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.send).toHaveBeenCalledWith({
          success: false,
          message: "Authentication failed",
        });
        expect(mockNext).not.toHaveBeenCalled();
        expect(consoleErrorSpy).toHaveBeenCalled();
      });
    });
  });

  describe("isAdmin", () => {
    describe("Authentication Check", () => {
      it("should return 401 if req.user is undefined", async () => {
        await isAdmin(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.send).toHaveBeenCalledWith({
          success: false,
          message: "Authentication required",
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it("should return 401 if req.user exists but has no _id", async () => {
        mockRequest.user = {} as any;

        await isAdmin(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.send).toHaveBeenCalledWith({
          success: false,
          message: "Authentication required",
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it("should return 401 if req.user._id is empty string", async () => {
        mockRequest.user = { _id: "" } as any;

        await isAdmin(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.send).toHaveBeenCalledWith({
          success: false,
          message: "Authentication required",
        });
        expect(mockNext).not.toHaveBeenCalled();
      });
    });

    describe("User Existence Check", () => {
      it("should return 401 if user not found in database", async () => {
        mockRequest.user = { _id: "user123" } as any;
        (userModel.findById as jest.Mock).mockResolvedValue(null);

        await isAdmin(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(userModel.findById).toHaveBeenCalledWith("user123");
        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.send).toHaveBeenCalledWith({
          success: false,
          message: "User not found",
        });
        expect(mockNext).not.toHaveBeenCalled();
      });
    });

    describe("Role Authorization", () => {
      it("should return 403 if user role is 0 (regular user)", async () => {
        mockRequest.user = { _id: "user123" } as any;
        (userModel.findById as jest.Mock).mockResolvedValue({ role: 0 });

        await isAdmin(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(mockResponse.send).toHaveBeenCalledWith({
          success: false,
          message: "Admin access required",
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it("should return 403 if user role is undefined", async () => {
        mockRequest.user = { _id: "user123" } as any;
        (userModel.findById as jest.Mock).mockResolvedValue({});

        await isAdmin(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(mockResponse.send).toHaveBeenCalledWith({
          success: false,
          message: "Admin access required",
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it("should return 403 if user role is 2 (unknown role)", async () => {
        mockRequest.user = { _id: "user123" } as any;
        (userModel.findById as jest.Mock).mockResolvedValue({ role: 2 });

        await isAdmin(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(mockResponse.send).toHaveBeenCalledWith({
          success: false,
          message: "Admin access required",
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it("should call next() if user role is 1 (admin)", async () => {
        mockRequest.user = { _id: "user123" } as any;
        (userModel.findById as jest.Mock).mockResolvedValue({ role: 1 });

        await isAdmin(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(userModel.findById).toHaveBeenCalledWith("user123");
        expect(userModel.findById).toHaveBeenCalledTimes(1);
        expect(mockNext).toHaveBeenCalled();
        expect(mockNext).toHaveBeenCalledTimes(1);
        expect(mockResponse.status).not.toHaveBeenCalled();
        expect(mockResponse.send).not.toHaveBeenCalled();
      });

      it("should use strict equality for role check (role: 1 only)", async () => {
        mockRequest.user = { _id: "user123" } as any;
        (userModel.findById as jest.Mock).mockResolvedValue({ role: "1" });

        await isAdmin(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(mockNext).not.toHaveBeenCalled();
      });
    });

    describe("Error Handling", () => {
      it("should return 500 if database query fails", async () => {
        mockRequest.user = { _id: "user123" } as any;
        const dbError = new Error("Database connection failed");
        (userModel.findById as jest.Mock).mockRejectedValue(dbError);

        await isAdmin(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.send).toHaveBeenCalledWith({
          success: false,
          message: "Authorization check failed",
        });
        expect(mockNext).not.toHaveBeenCalled();
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "Admin authorization error:",
          dbError
        );
      });

      it("should not expose error details to client", async () => {
        mockRequest.user = { _id: "user123" } as any;
        (userModel.findById as jest.Mock).mockRejectedValue(
          new Error("Sensitive DB error")
        );

        await isAdmin(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        const sendCall = (mockResponse.send as jest.Mock).mock.calls[0][0];
        expect(sendCall).not.toHaveProperty("error");
        expect(sendCall.message).toBe("Authorization check failed");
      });
    });
  });
});
