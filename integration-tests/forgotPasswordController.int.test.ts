import { Request, Response } from "express";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { forgotPasswordController } from "../controllers/authController";
import { comparePassword, hashPassword } from "../helpers/authHelper";
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

describe("Integration Tests: forgotPasswordController", () => {
  beforeAll(async () => {
    await dbConnect();
  });

  afterEach(async () => {
    await userModel.deleteMany({});
  });

  afterAll(async () => {
    await dbDisconnect();
  });

  describe("Successful password reset", () => {
    it("should reset password with correct email and answer", async () => {
      const oldPassword = "oldpassword123";
      await userModel.create({
        name: "John Doe",
        email: "john@example.com",
        password: await hashPassword(oldPassword),
        phone: "1234567890",
        address: "123 Main St",
        answer: "My Answer",
      });

      const req = mockRequest({
        email: "john@example.com",
        answer: "My Answer",
        newPassword: "newpassword456",
      });
      const res = mockResponse();

      await forgotPasswordController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: "Password Reset Successfully",
      });

      // Verify password was updated in database
      const updatedUser = await userModel.findOne({
        email: "john@example.com",
      });
      expect(updatedUser).toBeDefined();

      // Old password should not work
      const oldMatch = await comparePassword(
        oldPassword,
        updatedUser!.password
      );
      expect(oldMatch).toBe(false);

      // New password should work
      const newMatch = await comparePassword(
        "newpassword456",
        updatedUser!.password
      );
      expect(newMatch).toBe(true);
    });

    it("should hash new password using hashPassword helper", async () => {
      await userModel.create({
        name: "Jane Doe",
        email: "jane@example.com",
        password: await hashPassword("oldpass"),
        phone: "9876543210",
        address: "456 Oak Ave",
        answer: "Blue",
      });

      const req = mockRequest({
        email: "jane@example.com",
        answer: "Blue",
        newPassword: "myNewSecretPass",
      });
      const res = mockResponse();

      await forgotPasswordController(req, res);

      const updatedUser = await userModel.findOne({
        email: "jane@example.com",
      });

      // Password should be hashed (not plain text)
      expect(updatedUser?.password).not.toBe("myNewSecretPass");

      // Verify it's a valid bcrypt hash
      expect(updatedUser?.password).toMatch(/^\$2[aby]\$10\$/);
      expect(updatedUser?.password?.length).toBeGreaterThan(50);
    });

    it("should update only password field, not other user data", async () => {
      const originalData = {
        name: "Test User",
        email: "test@example.com",
        password: await hashPassword("oldpass123"),
        phone: "5555555555",
        address: { street: "789 Elm St", city: "TestCity" },
        answer: "TestAnswer",
        role: 1, // Admin user
      };

      const user = await userModel.create(originalData);

      const req = mockRequest({
        email: "test@example.com",
        answer: "TestAnswer",
        newPassword: "brandnewpass",
      });
      const res = mockResponse();

      await forgotPasswordController(req, res);

      const updatedUser = await userModel.findById(user._id);

      // All fields except password should remain unchanged
      expect(updatedUser?.name).toBe(originalData.name);
      expect(updatedUser?.email).toBe(originalData.email);
      expect(updatedUser?.phone).toBe(originalData.phone);
      expect(updatedUser?.address).toEqual(originalData.address);
      expect(updatedUser?.answer).toBe(originalData.answer);
      expect(updatedUser?.role).toBe(originalData.role);

      // Only password should change
      expect(updatedUser?.password).not.toBe(originalData.password);
    });

    it("should work for admin users with role 1", async () => {
      await userModel.create({
        name: "Admin User",
        email: "admin@example.com",
        password: await hashPassword("adminoldpass"),
        phone: "1111111111",
        address: "Admin Street",
        answer: "Admin Answer",
        role: 1,
      });

      const req = mockRequest({
        email: "admin@example.com",
        answer: "Admin Answer",
        newPassword: "adminnewpass",
      });
      const res = mockResponse();

      await forgotPasswordController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: "Password Reset Successfully",
      });

      const updatedUser = await userModel.findOne({
        email: "admin@example.com",
      });
      const newMatch = await comparePassword(
        "adminnewpass",
        updatedUser!.password
      );
      expect(newMatch).toBe(true);
    });
  });

  describe("Validation errors", () => {
    it("should return error if email is missing", async () => {
      const req = mockRequest({
        answer: "Answer",
        newPassword: "newpass123",
      });
      const res = mockResponse();

      await forgotPasswordController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({ message: "Emai is required" });

      // Verify no user was affected
      const count = await userModel.countDocuments();
      expect(count).toBe(0);
    });

    it("should return error if answer is missing", async () => {
      const req = mockRequest({
        email: "test@example.com",
        newPassword: "newpass123",
      });
      const res = mockResponse();

      await forgotPasswordController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({ message: "answer is required" });
    });

    it("should return error if newPassword is missing", async () => {
      const req = mockRequest({
        email: "test@example.com",
        answer: "Answer",
      });
      const res = mockResponse();

      await forgotPasswordController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        message: "New Password is required",
      });
    });
  });

  describe("Authentication failures", () => {
    it("should reject if email does not exist", async () => {
      const req = mockRequest({
        email: "nonexistent@example.com",
        answer: "Some Answer",
        newPassword: "newpass123",
      });
      const res = mockResponse();

      await forgotPasswordController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Wrong Email Or Answer",
      });
    });

    it("should reject if answer is incorrect", async () => {
      await userModel.create({
        name: "John Doe",
        email: "john@example.com",
        password: await hashPassword("oldpass"),
        phone: "1234567890",
        address: "123 Main St",
        answer: "Correct Answer",
      });

      const req = mockRequest({
        email: "john@example.com",
        answer: "Wrong Answer",
        newPassword: "newpass123",
      });
      const res = mockResponse();

      await forgotPasswordController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Wrong Email Or Answer",
      });

      // Verify password was not changed
      const user = await userModel.findOne({ email: "john@example.com" });
      const oldMatch = await comparePassword("oldpass", user!.password);
      expect(oldMatch).toBe(true);
    });

    it("should reject if email exists but answer is wrong", async () => {
      const originalPassword = await hashPassword("originalpass");
      await userModel.create({
        name: "Test User",
        email: "test@example.com",
        password: originalPassword,
        phone: "5555555555",
        address: "Test Address",
        answer: "Blue",
      });

      const req = mockRequest({
        email: "test@example.com",
        answer: "Red", // Wrong answer
        newPassword: "attemptednewpass",
      });
      const res = mockResponse();

      await forgotPasswordController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);

      // Password should remain unchanged
      const user = await userModel.findOne({ email: "test@example.com" });
      expect(user?.password).toBe(originalPassword);
    });

    it("should handle case-sensitive email and answer matching", async () => {
      await userModel.create({
        name: "Case Test",
        email: "casetest@example.com",
        password: await hashPassword("oldpass"),
        phone: "1234567890",
        address: "123 Main St",
        answer: "MyAnswer",
      });

      // Try with different case email
      const req1 = mockRequest({
        email: "CASETEST@EXAMPLE.COM",
        answer: "MyAnswer",
        newPassword: "newpass",
      });
      const res1 = mockResponse();

      await forgotPasswordController(req1, res1);

      // Current implementation is case-sensitive for email
      expect(res1.status).toHaveBeenCalledWith(404);

      // Try with different case answer
      const req2 = mockRequest({
        email: "casetest@example.com",
        answer: "myanswer",
        newPassword: "newpass",
      });
      const res2 = mockResponse();

      await forgotPasswordController(req2, res2);

      // Current implementation is case-sensitive for answer
      expect(res2.status).toHaveBeenCalledWith(404);
    });
  });

  describe("Database update integration", () => {
    it("should use findByIdAndUpdate to update password", async () => {
      const user = await userModel.create({
        name: "Update Test",
        email: "update@example.com",
        password: await hashPassword("oldpass"),
        phone: "7777777777",
        address: "Update Street",
        answer: "Update Answer",
      });

      const req = mockRequest({
        email: "update@example.com",
        answer: "Update Answer",
        newPassword: "updatedpass",
      });
      const res = mockResponse();

      await forgotPasswordController(req, res);

      // Query user again to verify update persisted
      const updatedUser = await userModel.findById(user._id);
      const match = await comparePassword("updatedpass", updatedUser!.password);
      expect(match).toBe(true);
    });

    it("should persist password update across multiple queries", async () => {
      await userModel.create({
        name: "Persist Test",
        email: "persist@example.com",
        password: await hashPassword("oldpass"),
        phone: "8888888888",
        address: "Persist Street",
        answer: "Persist Answer",
      });

      const req = mockRequest({
        email: "persist@example.com",
        answer: "Persist Answer",
        newPassword: "persistedpass",
      });
      const res = mockResponse();

      await forgotPasswordController(req, res);

      // Query 1: by email
      const user1 = await userModel.findOne({ email: "persist@example.com" });
      const match1 = await comparePassword("persistedpass", user1!.password);
      expect(match1).toBe(true);

      // Query 2: by id
      const user2 = await userModel.findById(user1!._id);
      const match2 = await comparePassword("persistedpass", user2!.password);
      expect(match2).toBe(true);

      // Both queries should return same password
      expect(user1?.password).toBe(user2?.password);
    });

    it("should update timestamps on password change", async () => {
      const user = await userModel.create({
        name: "Timestamp Test",
        email: "timestamp@example.com",
        password: await hashPassword("oldpass"),
        phone: "9999999999",
        address: "Timestamp Street",
        answer: "Timestamp Answer",
      });

      const originalUpdatedAt = user.updatedAt;

      // Wait a moment to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 100));

      const req = mockRequest({
        email: "timestamp@example.com",
        answer: "Timestamp Answer",
        newPassword: "newtimestamppass",
      });
      const res = mockResponse();

      await forgotPasswordController(req, res);

      const updatedUser = await userModel.findById(user._id);

      // updatedAt should be later than original
      expect(updatedUser?.updatedAt.getTime()).toBeGreaterThan(
        originalUpdatedAt.getTime()
      );
    });
  });

  describe("Password hashing integration", () => {
    it("should hash new password with bcrypt 10 salt rounds", async () => {
      await userModel.create({
        name: "Hash Test",
        email: "hash@example.com",
        password: await hashPassword("oldpass"),
        phone: "6666666666",
        address: "Hash Street",
        answer: "Hash Answer",
      });

      const req = mockRequest({
        email: "hash@example.com",
        answer: "Hash Answer",
        newPassword: "newhashpass",
      });
      const res = mockResponse();

      await forgotPasswordController(req, res);

      const user = await userModel.findOne({ email: "hash@example.com" });

      // Verify bcrypt format with 10 rounds
      expect(user?.password).toMatch(/^\$2[aby]\$10\$/);
    });

    it("should create different hashes for same password on different resets", async () => {
      const user1 = await userModel.create({
        name: "User 1",
        email: "user1@example.com",
        password: await hashPassword("oldpass1"),
        phone: "1111111111",
        address: "Address 1",
        answer: "Answer 1",
      });

      const user2 = await userModel.create({
        name: "User 2",
        email: "user2@example.com",
        password: await hashPassword("oldpass2"),
        phone: "2222222222",
        address: "Address 2",
        answer: "Answer 2",
      });

      // Reset both users to same password
      const req1 = mockRequest({
        email: "user1@example.com",
        answer: "Answer 1",
        newPassword: "sameNewPassword",
      });
      const res1 = mockResponse();

      const req2 = mockRequest({
        email: "user2@example.com",
        answer: "Answer 2",
        newPassword: "sameNewPassword",
      });
      const res2 = mockResponse();

      await forgotPasswordController(req1, res1);
      await forgotPasswordController(req2, res2);

      const updatedUser1 = await userModel.findById(user1._id);
      const updatedUser2 = await userModel.findById(user2._id);

      // Same password should produce different hashes (different salts)
      expect(updatedUser1?.password).not.toBe(updatedUser2?.password);

      // But both should verify correctly
      const match1 = await comparePassword(
        "sameNewPassword",
        updatedUser1!.password
      );
      const match2 = await comparePassword(
        "sameNewPassword",
        updatedUser2!.password
      );
      expect(match1).toBe(true);
      expect(match2).toBe(true);
    });

    it("should hash password even if new password is same as old", async () => {
      const password = "myPassword123";
      const oldHash = await hashPassword(password);

      await userModel.create({
        name: "Same Pass Test",
        email: "samepass@example.com",
        password: oldHash,
        phone: "3333333333",
        address: "Same Street",
        answer: "Same Answer",
      });

      // Reset to same password value
      const req = mockRequest({
        email: "samepass@example.com",
        answer: "Same Answer",
        newPassword: password,
      });
      const res = mockResponse();

      await forgotPasswordController(req, res);

      const user = await userModel.findOne({ email: "samepass@example.com" });

      // Should generate new hash (different salt)
      expect(user?.password).not.toBe(oldHash);

      // But should still verify correctly
      const match = await comparePassword(password, user!.password);
      expect(match).toBe(true);
    });
  });

  describe("Error handling", () => {
    it("should handle database errors gracefully", async () => {
      await userModel.create({
        name: "Test User",
        email: "test@example.com",
        password: await hashPassword("oldpass"),
        phone: "1234567890",
        address: "123 Main St",
        answer: "Answer",
      });

      const req = mockRequest({
        email: "test@example.com",
        answer: "Answer",
        newPassword: "newpass",
      });
      const res = mockResponse();

      // Force database error by closing connection
      await mongoose.connection.close();

      await forgotPasswordController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Something went wrong",
        error: expect.any(Error),
      });

      // Reconnect for cleanup
      await dbConnect();
    });

    it("should handle hashPassword errors", async () => {
      await userModel.create({
        name: "Test User",
        email: "test@example.com",
        password: await hashPassword("oldpass"),
        phone: "1234567890",
        address: "123 Main St",
        answer: "Answer",
      });

      const req = mockRequest({
        email: "test@example.com",
        answer: "Answer",
        newPassword: null, // This might cause hashPassword to fail
      });
      const res = mockResponse();

      await forgotPasswordController(req, res);

      // Should catch error and return 500
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("Security considerations", () => {
    it("should not leak information about whether email exists", async () => {
      await userModel.create({
        name: "Existing User",
        email: "exists@example.com",
        password: await hashPassword("password"),
        phone: "1234567890",
        address: "123 Main St",
        answer: "CorrectAnswer",
      });

      // Wrong email
      const req1 = mockRequest({
        email: "doesnotexist@example.com",
        answer: "SomeAnswer",
        newPassword: "newpass",
      });
      const res1 = mockResponse();

      await forgotPasswordController(req1, res1);

      // Wrong answer
      const req2 = mockRequest({
        email: "exists@example.com",
        answer: "WrongAnswer",
        newPassword: "newpass",
      });
      const res2 = mockResponse();

      await forgotPasswordController(req2, res2);

      // Both should return same error message
      expect(res1.send).toHaveBeenCalledWith({
        success: false,
        message: "Wrong Email Or Answer",
      });

      expect(res2.send).toHaveBeenCalledWith({
        success: false,
        message: "Wrong Email Or Answer",
      });
    });

    it("should require exact match of both email AND answer", async () => {
      await userModel.create({
        name: "User 1",
        email: "user1@example.com",
        password: await hashPassword("pass1"),
        phone: "1111111111",
        address: "Address 1",
        answer: "Answer1",
      });

      await userModel.create({
        name: "User 2",
        email: "user2@example.com",
        password: await hashPassword("pass2"),
        phone: "2222222222",
        address: "Address 2",
        answer: "Answer2",
      });

      // Try user1's email with user2's answer
      const req = mockRequest({
        email: "user1@example.com",
        answer: "Answer2",
        newPassword: "hackedpass",
      });
      const res = mockResponse();

      await forgotPasswordController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);

      // Verify password was not changed
      const user1 = await userModel.findOne({ email: "user1@example.com" });
      const match = await comparePassword("pass1", user1!.password);
      expect(match).toBe(true);
    });
  });

  describe("Concurrent password reset handling", () => {
    it("should handle multiple password resets for same user", async () => {
      await userModel.create({
        name: "Concurrent Test",
        email: "concurrent@example.com",
        password: await hashPassword("oldpass"),
        phone: "4444444444",
        address: "Concurrent Street",
        answer: "Concurrent Answer",
      });

      // Attempt two resets concurrently
      const req1 = mockRequest({
        email: "concurrent@example.com",
        answer: "Concurrent Answer",
        newPassword: "newpass1",
      });
      const res1 = mockResponse();

      const req2 = mockRequest({
        email: "concurrent@example.com",
        answer: "Concurrent Answer",
        newPassword: "newpass2",
      });
      const res2 = mockResponse();

      await Promise.all([
        forgotPasswordController(req1, res1),
        forgotPasswordController(req2, res2),
      ]);

      // Both should succeed
      expect(res1.status).toHaveBeenCalledWith(200);
      expect(res2.status).toHaveBeenCalledWith(200);

      // Final password should be one of the two (last write wins)
      const user = await userModel.findOne({ email: "concurrent@example.com" });
      const match1 = await comparePassword("newpass1", user!.password);
      const match2 = await comparePassword("newpass2", user!.password);

      // One of them should match
      expect(match1 || match2).toBe(true);
    });
  });
});
