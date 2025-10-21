import { Request, Response } from "express";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { registerController } from "../controllers/authController";
import { hashPassword } from "../helpers/authHelper";
import userModel from "../models/userModel";

// Mock braintree
jest.mock("braintree", () => ({
  BraintreeGateway: jest.fn().mockImplementation(() => ({})),
  Environment: { Sandbox: "Sandbox", Production: "Production" },
}));

const mockRequest = (body = {}): Request => {
  return { body } as Request;
};

const mockResponse = () => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

let mongoServer: MongoMemoryServer;

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

describe("Integration Tests: registerController", () => {
  beforeAll(async () => {
    await dbConnect();
  });

  afterEach(async () => {
    await userModel.deleteMany({});
  });

  afterAll(async () => {
    await dbDisconnect();
  });

  describe("Successful registration", () => {
    it("should register new user with hashed password", async () => {
      const req = mockRequest({
        name: "John Doe",
        email: "john@example.com",
        password: "password123",
        phone: "1234567890",
        address: "123 Main St",
        answer: "My Answer",
      });
      const res = mockResponse();

      await registerController(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: "User Register Successfully",
        user: expect.objectContaining({
          name: "John Doe",
          email: "john@example.com",
          phone: "1234567890",
        }),
      });

      // Verify user in database with hashed password
      const dbUser = await userModel.findOne({ email: "john@example.com" });
      expect(dbUser).toBeDefined();
      expect(dbUser?.password).not.toBe("password123");
      expect(dbUser?.password).toMatch(/^\$2[aby]\$10\$/); // bcrypt format
    });

    it("should hash password using hashPassword helper", async () => {
      const req = mockRequest({
        name: "Jane Doe",
        email: "jane@example.com",
        password: "mySecretPass",
        phone: "9876543210",
        address: "456 Oak Ave",
        answer: "Blue",
      });
      const res = mockResponse();

      await registerController(req, res);

      const dbUser = await userModel.findOne({ email: "jane@example.com" });

      // Password should be hashed (different from original)
      expect(dbUser?.password).not.toBe("mySecretPass");

      // Verify it's a valid bcrypt hash
      expect(dbUser?.password?.length).toBeGreaterThan(50);
    });

    it("should save all user fields to database", async () => {
      const userData = {
        name: "Test User",
        email: "test@example.com",
        password: "testpass123",
        phone: "5555555555",
        address: { street: "789 Elm St", city: "TestCity" },
        answer: "TestAnswer",
      };
      const req = mockRequest(userData);
      const res = mockResponse();

      await registerController(req, res);

      const dbUser = await userModel.findOne({ email: userData.email });
      expect(dbUser).toBeDefined();
      expect(dbUser?.name).toBe(userData.name);
      expect(dbUser?.email).toBe(userData.email);
      expect(dbUser?.phone).toBe(userData.phone);
      expect(dbUser?.address).toEqual(userData.address);
      expect(dbUser?.answer).toBe(userData.answer);
      expect(dbUser?.role).toBe(0); // Default role
    });
  });

  describe("Validation errors", () => {
    it("should return error if name is missing", async () => {
      const req = mockRequest({
        email: "test@example.com",
        password: "pass123",
        phone: "1234567890",
        address: "123 Main St",
        answer: "Answer",
      });
      const res = mockResponse();

      await registerController(req, res);

      expect(res.send).toHaveBeenCalledWith({ error: "Name is Required" });

      // Verify user was not created
      const count = await userModel.countDocuments();
      expect(count).toBe(0);
    });

    it("should return error if email is missing", async () => {
      const req = mockRequest({
        name: "John Doe",
        password: "pass123",
        phone: "1234567890",
        address: "123 Main St",
        answer: "Answer",
      });
      const res = mockResponse();

      await registerController(req, res);

      expect(res.send).toHaveBeenCalledWith({ message: "Email is Required" });
    });

    it("should return error if password is missing", async () => {
      const req = mockRequest({
        name: "John Doe",
        email: "test@example.com",
        phone: "1234567890",
        address: "123 Main St",
        answer: "Answer",
      });
      const res = mockResponse();

      await registerController(req, res);

      expect(res.send).toHaveBeenCalledWith({
        message: "Password is Required",
      });
    });

    it("should return error if phone is missing", async () => {
      const req = mockRequest({
        name: "John Doe",
        email: "test@example.com",
        password: "pass123",
        address: "123 Main St",
        answer: "Answer",
      });
      const res = mockResponse();

      await registerController(req, res);

      expect(res.send).toHaveBeenCalledWith({
        message: "Phone no is Required",
      });
    });

    it("should return error if address is missing", async () => {
      const req = mockRequest({
        name: "John Doe",
        email: "test@example.com",
        password: "pass123",
        phone: "1234567890",
        answer: "Answer",
      });
      const res = mockResponse();

      await registerController(req, res);

      expect(res.send).toHaveBeenCalledWith({ message: "Address is Required" });
    });

    it("should return error if answer is missing", async () => {
      const req = mockRequest({
        name: "John Doe",
        email: "test@example.com",
        password: "pass123",
        phone: "1234567890",
        address: "123 Main St",
      });
      const res = mockResponse();

      await registerController(req, res);

      expect(res.send).toHaveBeenCalledWith({ message: "Answer is Required" });
    });
  });

  describe("Duplicate user handling", () => {
    it("should reject registration if email already exists", async () => {
      // First registration
      await userModel.create({
        name: "Existing User",
        email: "existing@example.com",
        password: await hashPassword("password123"),
        phone: "1111111111",
        address: "Old Address",
        answer: "Old Answer",
      });

      // Attempt duplicate registration
      const req = mockRequest({
        name: "New User",
        email: "existing@example.com",
        password: "newpass123",
        phone: "2222222222",
        address: "New Address",
        answer: "New Answer",
      });
      const res = mockResponse();

      await registerController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Already Register please login",
      });

      // Verify only one user exists
      const userCount = await userModel.countDocuments({
        email: "existing@example.com",
      });
      expect(userCount).toBe(1);

      // Verify original user data not modified
      const dbUser = await userModel.findOne({ email: "existing@example.com" });
      expect(dbUser?.name).toBe("Existing User");
      expect(dbUser?.phone).toBe("1111111111");
    });

    it("should handle case-sensitive email check", async () => {
      await userModel.create({
        name: "User One",
        email: "test@example.com",
        password: await hashPassword("pass1"),
        phone: "1111111111",
        address: "Address 1",
        answer: "Answer 1",
      });

      // Try with different case (should succeed based on current implementation)
      const req = mockRequest({
        name: "User Two",
        email: "TEST@EXAMPLE.COM",
        password: "pass2",
        phone: "2222222222",
        address: "Address 2",
        answer: "Answer 2",
      });
      const res = mockResponse();

      await registerController(req, res);

      // Current implementation is case-sensitive, so this will create a new user
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe("Password hashing integration", () => {
    it("should use bcrypt with 10 salt rounds", async () => {
      const req = mockRequest({
        name: "Hash Test",
        email: "hash@example.com",
        password: "testpassword",
        phone: "9999999999",
        address: "Hash Street",
        answer: "Hash Answer",
      });
      const res = mockResponse();

      await registerController(req, res);

      const dbUser = await userModel.findOne({ email: "hash@example.com" });

      // Verify bcrypt format with 10 rounds
      expect(dbUser?.password).toMatch(/^\$2[aby]\$10\$/);
    });

    it("should create different hashes for same password", async () => {
      const req1 = mockRequest({
        name: "User 1",
        email: "user1@example.com",
        password: "samePassword",
        phone: "1111111111",
        address: "Address 1",
        answer: "Answer 1",
      });
      const res1 = mockResponse();

      const req2 = mockRequest({
        name: "User 2",
        email: "user2@example.com",
        password: "samePassword",
        phone: "2222222222",
        address: "Address 2",
        answer: "Answer 2",
      });
      const res2 = mockResponse();

      await registerController(req1, res1);
      await registerController(req2, res2);

      const user1 = await userModel.findOne({ email: "user1@example.com" });
      const user2 = await userModel.findOne({ email: "user2@example.com" });

      // Same password should produce different hashes (different salts)
      expect(user1?.password).not.toBe(user2?.password);
    });
  });

  describe("Error handling", () => {
    it("should handle database errors gracefully", async () => {
      const req = mockRequest({
        name: "Test User",
        email: "test@example.com",
        password: "pass123",
        phone: "1234567890",
        address: "123 Main St",
        answer: "Answer",
      });
      const res = mockResponse();

      // Force database error by closing connection
      await mongoose.connection.close();

      await registerController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Errro in Registeration",
        error: expect.any(Error),
      });

      // Reconnect for cleanup
      await dbConnect();
    });

    it("should handle hashPassword errors", async () => {
      const req = mockRequest({
        name: "Test User",
        email: "test@example.com",
        password: null, // This might cause hashPassword to fail
        phone: "1234567890",
        address: "123 Main St",
        answer: "Answer",
      });
      const res = mockResponse();

      await registerController(req, res);

      // Should catch error and return 500
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("Data persistence verification", () => {
    it("should persist user data across queries", async () => {
      const req = mockRequest({
        name: "Persistent User",
        email: "persist@example.com",
        password: "pass123",
        phone: "5555555555",
        address: { street: "123 Persist St", city: "DataCity" },
        answer: "PersistAnswer",
      });
      const res = mockResponse();

      await registerController(req, res);

      // Query 1
      const user1 = await userModel.findOne({ email: "persist@example.com" });

      // Query 2 (different query)
      const user2 = await userModel.findById(user1?._id);

      expect(user2?.email).toBe("persist@example.com");
      expect(user2?.name).toBe("Persistent User");
    });

    it("should auto-generate timestamps", async () => {
      const req = mockRequest({
        name: "Timestamp User",
        email: "timestamp@example.com",
        password: "pass123",
        phone: "1234567890",
        address: "123 Main St",
        answer: "Answer",
      });
      const res = mockResponse();

      const beforeTime = new Date();
      await registerController(req, res);
      const afterTime = new Date();

      const dbUser = await userModel.findOne({
        email: "timestamp@example.com",
      });

      expect(dbUser?.createdAt).toBeDefined();
      expect(dbUser?.updatedAt).toBeDefined();
      expect(dbUser?.createdAt.getTime()).toBeGreaterThanOrEqual(
        beforeTime.getTime()
      );
      expect(dbUser?.createdAt.getTime()).toBeLessThanOrEqual(
        afterTime.getTime()
      );
    });
  });
});
