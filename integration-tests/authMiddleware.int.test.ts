import { Request, Response } from "express";
import JWT from "jsonwebtoken";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { isAdmin, requireSignIn } from "../middlewares/authMiddleware";
import userModel from "../models/userModel";

// Mock braintree to avoid initialization errors
jest.mock("braintree", () => {
  return {
    BraintreeGateway: jest.fn().mockImplementation(() => ({})),
    Environment: { Sandbox: "Sandbox", Production: "Production" },
  };
});

const mockRequest = (
  headers: any = {},
  user: any = null
): Request & { user?: any } => {
  return {
    headers,
    user,
  } as Request & { user?: any };
};

const mockResponse = () => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = jest.fn();

let mongoServer: MongoMemoryServer;
let testUser: any;
let adminUser: any;
const JWT_SECRET = "test-jwt-secret-key";

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

const seedUsers = async () => {
  const users = await userModel.insertMany([
    {
      name: "Regular User",
      email: "user@test.com",
      password: "hashedpassword123",
      phone: "1234567890",
      address: { street: "123 Test St" },
      answer: "test answer",
      role: 0, // Regular user
    },
    {
      name: "Admin User",
      email: "admin@test.com",
      password: "hashedpassword456",
      phone: "0987654321",
      address: { street: "456 Admin Ave" },
      answer: "admin answer",
      role: 1, // Admin user
    },
  ]);
  return users;
};

describe("Integration Tests for authMiddleware", () => {
  let originalJwtSecret: string | undefined;

  beforeAll(async () => {
    originalJwtSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = JWT_SECRET;
    await dbConnect();
  });

  beforeEach(async () => {
    const users = await seedUsers();
    testUser = users[0];
    adminUser = users[1];
    mockNext.mockClear();
  });

  afterEach(async () => {
    await userModel.deleteMany({});
  });

  afterAll(async () => {
    process.env.JWT_SECRET = originalJwtSecret;
    await dbDisconnect();
  });

  describe("requireSignIn middleware", () => {
    describe("Successful authentication", () => {
      it("should authenticate with valid Bearer token format", async () => {
        const token = JWT.sign({ _id: testUser._id.toString() }, JWT_SECRET);
        const req = mockRequest({ authorization: `Bearer ${token}` });
        const res = mockResponse();

        await requireSignIn(req, res, mockNext);

        expect(mockNext).toHaveBeenCalledTimes(1);
        expect(req.user).toBeDefined();
        expect(req.user._id).toBe(testUser._id.toString());
        expect(res.status).not.toHaveBeenCalled();
        expect(res.send).not.toHaveBeenCalled();
      });

      it("should authenticate with plain token (no Bearer prefix)", async () => {
        const token = JWT.sign({ _id: testUser._id.toString() }, JWT_SECRET);
        const req = mockRequest({ authorization: token });
        const res = mockResponse();

        await requireSignIn(req, res, mockNext);

        expect(mockNext).toHaveBeenCalledTimes(1);
        expect(req.user).toBeDefined();
        expect(req.user._id).toBe(testUser._id.toString());
      });

      it("should handle token with additional JWT claims (iat, exp)", async () => {
        const token = JWT.sign({ _id: testUser._id.toString() }, JWT_SECRET, {
          expiresIn: "1h",
        });
        const req = mockRequest({ authorization: `Bearer ${token}` });
        const res = mockResponse();

        await requireSignIn(req, res, mockNext);

        expect(mockNext).toHaveBeenCalledTimes(1);
        expect(req.user).toBeDefined();
        expect(req.user._id).toBe(testUser._id.toString());
        expect(req.user.iat).toBeDefined();
        expect(req.user.exp).toBeDefined();
      });
    });

    describe("Missing or invalid authorization header", () => {
      it("should reject request with no authorization header", async () => {
        const req = mockRequest({});
        const res = mockResponse();

        await requireSignIn(req, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.send).toHaveBeenCalledWith({
          success: false,
          message: "Authorization token required",
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it("should reject request with empty authorization header", async () => {
        const req = mockRequest({ authorization: "" });
        const res = mockResponse();

        await requireSignIn(req, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.send).toHaveBeenCalledWith({
          success: false,
          message: "Authorization token required",
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it("should reject request with Bearer prefix but no token", async () => {
        const req = mockRequest({ authorization: "Bearer " });
        const res = mockResponse();

        await requireSignIn(req, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.send).toHaveBeenCalledWith({
          success: false,
          message: "Invalid authorization token",
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it("should reject request with only whitespace token", async () => {
        const req = mockRequest({ authorization: "Bearer    " });
        const res = mockResponse();

        await requireSignIn(req, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.send).toHaveBeenCalledWith({
          success: false,
          message: "Invalid authorization token",
        });
        expect(mockNext).not.toHaveBeenCalled();
      });
    });

    describe("Invalid tokens", () => {
      it("should reject malformed JWT token", async () => {
        const req = mockRequest({ authorization: "Bearer invalid.token.here" });
        const res = mockResponse();

        await requireSignIn(req, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.send).toHaveBeenCalledWith({
          success: false,
          message: "Invalid token",
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it("should reject token signed with wrong secret", async () => {
        const token = JWT.sign(
          { _id: testUser._id.toString() },
          "wrong-secret-key"
        );
        const req = mockRequest({ authorization: `Bearer ${token}` });
        const res = mockResponse();

        await requireSignIn(req, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.send).toHaveBeenCalledWith({
          success: false,
          message: "Invalid token",
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it("should reject expired token", async () => {
        const token = JWT.sign(
          { _id: testUser._id.toString() },
          JWT_SECRET,
          { expiresIn: "-1s" } // Already expired
        );
        const req = mockRequest({ authorization: `Bearer ${token}` });
        const res = mockResponse();

        await requireSignIn(req, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.send).toHaveBeenCalledWith({
          success: false,
          message: "Token expired",
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it("should reject token with missing _id in payload", async () => {
        const token = JWT.sign({ email: "test@test.com" }, JWT_SECRET);
        const req = mockRequest({ authorization: `Bearer ${token}` });
        const res = mockResponse();

        await requireSignIn(req, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.send).toHaveBeenCalledWith({
          success: false,
          message: "Invalid token payload",
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it("should reject completely random string as token", async () => {
        const req = mockRequest({ authorization: "Bearer randomgarbage123" });
        const res = mockResponse();

        await requireSignIn(req, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.send).toHaveBeenCalledWith({
          success: false,
          message: "Invalid token",
        });
        expect(mockNext).not.toHaveBeenCalled();
      });
    });

    describe("Server configuration errors", () => {
      it("should handle missing JWT_SECRET environment variable", async () => {
        const originalSecret = process.env.JWT_SECRET;
        delete process.env.JWT_SECRET;

        const req = mockRequest({ authorization: "Bearer sometoken" });
        const res = mockResponse();
        const consoleErrorSpy = jest
          .spyOn(console, "error")
          .mockImplementation();

        await requireSignIn(req, res, mockNext);

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "JWT_SECRET is not configured"
        );
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
          success: false,
          message: "Server configuration error",
        });
        expect(mockNext).not.toHaveBeenCalled();

        process.env.JWT_SECRET = originalSecret;
        consoleErrorSpy.mockRestore();
      });
    });
  });

  describe("isAdmin middleware", () => {
    describe("Successful admin authorization", () => {
      it("should authorize admin user successfully", async () => {
        const req = mockRequest({}, { _id: adminUser._id.toString() });
        const res = mockResponse();

        await isAdmin(req, res, mockNext);

        expect(mockNext).toHaveBeenCalledTimes(1);
        expect(res.status).not.toHaveBeenCalled();
        expect(res.send).not.toHaveBeenCalled();
      });

      it("should verify admin role from database correctly", async () => {
        const req = mockRequest({}, { _id: adminUser._id.toString() });
        const res = mockResponse();

        const userSpy = jest.spyOn(userModel, "findById");

        await isAdmin(req, res, mockNext);

        expect(userSpy).toHaveBeenCalledWith(adminUser._id.toString());
        expect(mockNext).toHaveBeenCalledTimes(1);

        userSpy.mockRestore();
      });
    });

    describe("Failed admin authorization", () => {
      it("should reject request without user in request object", async () => {
        const req = mockRequest({}, null);
        const res = mockResponse();

        await isAdmin(req, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.send).toHaveBeenCalledWith({
          success: false,
          message: "Authentication required",
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it("should reject request with user object but missing _id", async () => {
        const req = mockRequest({}, { email: "test@test.com" });
        const res = mockResponse();

        await isAdmin(req, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.send).toHaveBeenCalledWith({
          success: false,
          message: "Authentication required",
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it("should reject non-admin user (role 0)", async () => {
        const req = mockRequest({}, { _id: testUser._id.toString() });
        const res = mockResponse();

        await isAdmin(req, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.send).toHaveBeenCalledWith({
          success: false,
          message: "Admin access required",
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it("should reject request with non-existent user ID", async () => {
        const fakeUserId = new mongoose.Types.ObjectId().toString();
        const req = mockRequest({}, { _id: fakeUserId });
        const res = mockResponse();

        await isAdmin(req, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.send).toHaveBeenCalledWith({
          success: false,
          message: "User not found",
        });
        expect(mockNext).not.toHaveBeenCalled();
      });
    });

    describe("Database errors and edge cases", () => {
      it("should handle database connection errors gracefully", async () => {
        const req = mockRequest({}, { _id: adminUser._id.toString() });
        const res = mockResponse();

        const userSpy = jest
          .spyOn(userModel, "findById")
          .mockRejectedValueOnce(new Error("Database connection failed"));

        const consoleErrorSpy = jest
          .spyOn(console, "error")
          .mockImplementation();

        await isAdmin(req, res, mockNext);

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "Admin authorization error:",
          expect.any(Error)
        );
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
          success: false,
          message: "Authorization check failed",
        });
        expect(mockNext).not.toHaveBeenCalled();

        userSpy.mockRestore();
        consoleErrorSpy.mockRestore();
      });

      it("should handle invalid ObjectId format", async () => {
        const req = mockRequest({}, { _id: "invalid-id-format" });
        const res = mockResponse();

        const consoleErrorSpy = jest
          .spyOn(console, "error")
          .mockImplementation();

        await isAdmin(req, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
          success: false,
          message: "Authorization check failed",
        });
        expect(mockNext).not.toHaveBeenCalled();

        consoleErrorSpy.mockRestore();
      });
    });

    describe("Role-based access control edge cases", () => {
      it("should reject user with role 2 (neither admin nor regular)", async () => {
        const specialUser = await userModel.create({
          name: "Special User",
          email: "special@test.com",
          password: "hashedpassword789",
          phone: "5555555555",
          address: { street: "789 Special Blvd" },
          answer: "special answer",
          role: 2,
        });

        const req = mockRequest({}, { _id: specialUser._id.toString() });
        const res = mockResponse();

        await isAdmin(req, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.send).toHaveBeenCalledWith({
          success: false,
          message: "Admin access required",
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it("should reject user with negative role", async () => {
        const negativeRoleUser = await userModel.create({
          name: "Negative Role User",
          email: "negative@test.com",
          password: "hashedpassword012",
          phone: "6666666666",
          address: { street: "012 Negative St" },
          answer: "negative answer",
          role: -1,
        });

        const req = mockRequest({}, { _id: negativeRoleUser._id.toString() });
        const res = mockResponse();

        await isAdmin(req, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.send).toHaveBeenCalledWith({
          success: false,
          message: "Admin access required",
        });
        expect(mockNext).not.toHaveBeenCalled();
      });
    });
  });

  describe("Integration: requireSignIn + isAdmin middleware chain", () => {
    it("should successfully authenticate and authorize admin user through full chain", async () => {
      const token = JWT.sign({ _id: adminUser._id.toString() }, JWT_SECRET);
      const req = mockRequest({ authorization: `Bearer ${token}` });
      const res = mockResponse();

      // First middleware: requireSignIn
      await requireSignIn(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(req.user).toBeDefined();

      // Clear mock for next middleware
      mockNext.mockClear();

      // Second middleware: isAdmin
      await isAdmin(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });

    it("should authenticate regular user but deny admin access in chain", async () => {
      const token = JWT.sign({ _id: testUser._id.toString() }, JWT_SECRET);
      const req = mockRequest({ authorization: `Bearer ${token}` });
      const res = mockResponse();

      // First middleware: requireSignIn
      await requireSignIn(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(req.user).toBeDefined();

      // Clear mock for next middleware
      mockNext.mockClear();

      // Second middleware: isAdmin
      await isAdmin(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Admin access required",
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should fail at requireSignIn and never reach isAdmin", async () => {
      const req = mockRequest({ authorization: "Bearer invalid.token" });
      const res = mockResponse();

      // First middleware: requireSignIn
      await requireSignIn(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
      expect(req.user).toBeUndefined();

      // isAdmin would never be called in real scenario
    });
  });

  describe("Concurrency and race condition tests", () => {
    it("should handle multiple simultaneous authentication requests", async () => {
      const token1 = JWT.sign({ _id: testUser._id.toString() }, JWT_SECRET);
      const token2 = JWT.sign({ _id: adminUser._id.toString() }, JWT_SECRET);

      const req1 = mockRequest({ authorization: `Bearer ${token1}` });
      const req2 = mockRequest({ authorization: `Bearer ${token2}` });
      const res1 = mockResponse();
      const res2 = mockResponse();
      const next1 = jest.fn();
      const next2 = jest.fn();

      // Execute both authentications concurrently
      await Promise.all([
        requireSignIn(req1, res1, next1),
        requireSignIn(req2, res2, next2),
      ]);

      expect(next1).toHaveBeenCalledTimes(1);
      expect(next2).toHaveBeenCalledTimes(1);
      expect(req1.user._id).toBe(testUser._id.toString());
      expect(req2.user._id).toBe(adminUser._id.toString());
    });

    it("should handle multiple simultaneous admin authorization checks", async () => {
      const req1 = mockRequest({}, { _id: adminUser._id.toString() });
      const req2 = mockRequest({}, { _id: testUser._id.toString() });
      const res1 = mockResponse();
      const res2 = mockResponse();
      const next1 = jest.fn();
      const next2 = jest.fn();

      // Execute both authorizations concurrently
      await Promise.all([
        isAdmin(req1, res1, next1),
        isAdmin(req2, res2, next2),
      ]);

      expect(next1).toHaveBeenCalledTimes(1); // Admin succeeds
      expect(next2).not.toHaveBeenCalled(); // Regular user fails
      expect(res2.status).toHaveBeenCalledWith(403);
    });
  });
});
