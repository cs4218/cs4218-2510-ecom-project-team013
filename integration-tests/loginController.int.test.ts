import { Request, Response } from "express";
import JWT from "jsonwebtoken";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { loginController } from "../controllers/authController";
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

describe("Integration Tests: loginController", () => {
  beforeAll(async () => {
    await dbConnect();
    // Set JWT_SECRET for tests
    process.env.JWT_SECRET = "test-secret-key";
  });

  afterEach(async () => {
    await userModel.deleteMany({});
  });

  afterAll(async () => {
    await dbDisconnect();
  });

  describe("Successful login", () => {
    it("should login user with valid credentials", async () => {
      // Create user first
      await userModel.create({
        name: "John Doe",
        email: "john@example.com",
        password: await hashPassword("password123"),
        phone: "1234567890",
        address: "123 Main St",
        answer: "My Answer",
      });

      const req = mockRequest({
        email: "john@example.com",
        password: "password123",
      });
      const res = mockResponse();

      await loginController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: "login successfully",
        user: expect.objectContaining({
          name: "John Doe",
          email: "john@example.com",
          phone: "1234567890",
          role: 0,
        }),
        token: expect.any(String),
      });
    });

    it("should generate valid JWT token with correct payload", async () => {
      const user = await userModel.create({
        name: "Jane Doe",
        email: "jane@example.com",
        password: await hashPassword("mypass"),
        phone: "9876543210",
        address: "456 Oak Ave",
        answer: "Blue",
      });

      const req = mockRequest({
        email: "jane@example.com",
        password: "mypass",
      });
      const res = mockResponse();

      await loginController(req, res);

      const sendCall = (res.send as jest.Mock).mock.calls[0][0];
      const token = sendCall.token;

      // Verify JWT structure
      expect(token).toBeTruthy();

      // Decode and verify token payload
      const decoded = JWT.verify(token, process.env.JWT_SECRET!) as any;
      expect(decoded._id).toBe(user._id.toString());
      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();

      // Verify 7-day expiration
      const expiresIn = decoded.exp - decoded.iat;
      expect(expiresIn).toBe(7 * 24 * 60 * 60); // 7 days in seconds
    });

    it("should return user data without password", async () => {
      await userModel.create({
        name: "Test User",
        email: "test@example.com",
        password: await hashPassword("testpass"),
        phone: "5555555555",
        address: { street: "789 Elm St", city: "TestCity" },
        answer: "TestAnswer",
      });

      const req = mockRequest({
        email: "test@example.com",
        password: "testpass",
      });
      const res = mockResponse();

      await loginController(req, res);

      const sendCall = (res.send as jest.Mock).mock.calls[0][0];
      const userData = sendCall.user;

      // Verify password is not included in response
      expect(userData.password).toBeUndefined();
      expect(userData._id).toBeDefined();
      expect(userData.name).toBe("Test User");
      expect(userData.email).toBe("test@example.com");
      expect(userData.phone).toBe("5555555555");
      expect(userData.address).toEqual({
        street: "789 Elm St",
        city: "TestCity",
      });
      expect(userData.role).toBe(0);
    });

    it("should login admin user with role field", async () => {
      await userModel.create({
        name: "Admin User",
        email: "admin@example.com",
        password: await hashPassword("adminpass"),
        phone: "1111111111",
        address: "Admin Street",
        answer: "Admin Answer",
        role: 1,
      });

      const req = mockRequest({
        email: "admin@example.com",
        password: "adminpass",
      });
      const res = mockResponse();

      await loginController(req, res);

      const sendCall = (res.send as jest.Mock).mock.calls[0][0];
      expect(sendCall.user.role).toBe(1);
    });
  });

  describe("Validation errors", () => {
    it("should return error if email is missing", async () => {
      const req = mockRequest({
        password: "password123",
      });
      const res = mockResponse();

      await loginController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Invalid email or password",
      });
    });

    it("should return error if password is missing", async () => {
      const req = mockRequest({
        email: "test@example.com",
      });
      const res = mockResponse();

      await loginController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Invalid email or password",
      });
    });

    it("should return error if both email and password are missing", async () => {
      const req = mockRequest({});
      const res = mockResponse();

      await loginController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Invalid email or password",
      });
    });
  });

  describe("Authentication failures", () => {
    it("should reject login if email not registered", async () => {
      const req = mockRequest({
        email: "nonexistent@example.com",
        password: "password123",
      });
      const res = mockResponse();

      await loginController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Email is not registerd",
      });
    });

    it("should reject login with incorrect password", async () => {
      await userModel.create({
        name: "John Doe",
        email: "john@example.com",
        password: await hashPassword("correctpass"),
        phone: "1234567890",
        address: "123 Main St",
        answer: "My Answer",
      });

      const req = mockRequest({
        email: "john@example.com",
        password: "wrongpass",
      });
      const res = mockResponse();

      await loginController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Invalid Password",
      });
    });

    it("should handle case-sensitive email lookup", async () => {
      await userModel.create({
        name: "User One",
        email: "test@example.com",
        password: await hashPassword("pass1"),
        phone: "1111111111",
        address: "Address 1",
        answer: "Answer 1",
      });

      // Try login with different case
      const req = mockRequest({
        email: "TEST@EXAMPLE.COM",
        password: "pass1",
      });
      const res = mockResponse();

      await loginController(req, res);

      // Current implementation is case-sensitive, so this will fail
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Email is not registerd",
      });
    });
  });

  describe("Password comparison integration", () => {
    it("should use comparePassword to verify credentials", async () => {
      const plainPassword = "testPassword123";
      const hashedPassword = await hashPassword(plainPassword);

      await userModel.create({
        name: "Compare Test",
        email: "compare@example.com",
        password: hashedPassword,
        phone: "9999999999",
        address: "Compare Street",
        answer: "Compare Answer",
      });

      const req = mockRequest({
        email: "compare@example.com",
        password: plainPassword,
      });
      const res = mockResponse();

      await loginController(req, res);

      // Should successfully login with correct password
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "login successfully",
        })
      );
    });

    it("should reject similar but incorrect passwords", async () => {
      await userModel.create({
        name: "Test User",
        email: "test@example.com",
        password: await hashPassword("password123"),
        phone: "1234567890",
        address: "123 Main St",
        answer: "Answer",
      });

      const testCases = [
        "password124", // Different digit
        "Password123", // Different case
        "password12", // Missing digit
        "password123 ", // Extra space
        " password123", // Leading space
      ];

      for (const wrongPass of testCases) {
        const req = mockRequest({
          email: "test@example.com",
          password: wrongPass,
        });
        const res = mockResponse();

        await loginController(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
          success: false,
          message: "Invalid Password",
        });
      }
    });
  });

  describe("JWT token integration", () => {
    it("should generate JWT using process.env.JWT_SECRET", async () => {
      const user = await userModel.create({
        name: "JWT Test",
        email: "jwt@example.com",
        password: await hashPassword("jwtpass"),
        phone: "7777777777",
        address: "JWT Street",
        answer: "JWT Answer",
      });

      const req = mockRequest({
        email: "jwt@example.com",
        password: "jwtpass",
      });
      const res = mockResponse();

      await loginController(req, res);

      const sendCall = (res.send as jest.Mock).mock.calls[0][0];
      const token = sendCall.token;

      // Verify token was signed with correct secret
      expect(() => {
        JWT.verify(token, process.env.JWT_SECRET!);
      }).not.toThrow();

      // Verify token cannot be verified with wrong secret
      expect(() => {
        JWT.verify(token, "wrong-secret");
      }).toThrow();
    });

    it("should include only _id in JWT payload", async () => {
      const user = await userModel.create({
        name: "Payload Test",
        email: "payload@example.com",
        password: await hashPassword("payloadpass"),
        phone: "8888888888",
        address: "Payload Street",
        answer: "Payload Answer",
      });

      const req = mockRequest({
        email: "payload@example.com",
        password: "payloadpass",
      });
      const res = mockResponse();

      await loginController(req, res);

      const sendCall = (res.send as jest.Mock).mock.calls[0][0];
      const token = sendCall.token;

      const decoded = JWT.verify(token, process.env.JWT_SECRET!) as any;

      // Should only have _id, iat, and exp (not name, email, etc.)
      expect(decoded._id).toBeDefined();
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
      expect(decoded.name).toBeUndefined();
      expect(decoded.email).toBeUndefined();
      expect(decoded.password).toBeUndefined();
    });

    it("should generate unique tokens for same user on different logins", async () => {
      await userModel.create({
        name: "Unique Test",
        email: "unique@example.com",
        password: await hashPassword("uniquepass"),
        phone: "6666666666",
        address: "Unique Street",
        answer: "Unique Answer",
      });

      // First login
      const req1 = mockRequest({
        email: "unique@example.com",
        password: "uniquepass",
      });
      const res1 = mockResponse();

      await loginController(req1, res1);
      const token1 = (res1.send as jest.Mock).mock.calls[0][0].token;

      // Wait a moment to ensure different iat
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Second login
      const req2 = mockRequest({
        email: "unique@example.com",
        password: "uniquepass",
      });
      const res2 = mockResponse();

      await loginController(req2, res2);
      const token2 = (res2.send as jest.Mock).mock.calls[0][0].token;

      // Tokens should be different (different iat)
      expect(token1).not.toBe(token2);

      // But both should be valid and decode to same user
      const decoded1 = JWT.verify(token1, process.env.JWT_SECRET!) as any;
      const decoded2 = JWT.verify(token2, process.env.JWT_SECRET!) as any;
      expect(decoded1._id).toBe(decoded2._id);
    });
  });

  describe("Database query integration", () => {
    it("should query user by email from database", async () => {
      const user1 = await userModel.create({
        name: "User 1",
        email: "user1@example.com",
        password: await hashPassword("pass1"),
        phone: "1111111111",
        address: "Address 1",
        answer: "Answer 1",
      });

      const user2 = await userModel.create({
        name: "User 2",
        email: "user2@example.com",
        password: await hashPassword("pass2"),
        phone: "2222222222",
        address: "Address 2",
        answer: "Answer 2",
      });

      // Login as user1
      const req = mockRequest({
        email: "user1@example.com",
        password: "pass1",
      });
      const res = mockResponse();

      await loginController(req, res);

      const sendCall = (res.send as jest.Mock).mock.calls[0][0];
      expect(sendCall.user._id.toString()).toBe(user1._id.toString());
      expect(sendCall.user._id.toString()).not.toBe(user2._id.toString());
    });

    it("should retrieve all user fields from database", async () => {
      const userData = {
        name: "Full Data User",
        email: "fulldata@example.com",
        password: await hashPassword("fullpass"),
        phone: "3333333333",
        address: { street: "Full St", city: "Full City", zip: "12345" },
        answer: "Full Answer",
        role: 0,
      };

      await userModel.create(userData);

      const req = mockRequest({
        email: "fulldata@example.com",
        password: "fullpass",
      });
      const res = mockResponse();

      await loginController(req, res);

      const sendCall = (res.send as jest.Mock).mock.calls[0][0];
      const returnedUser = sendCall.user;

      expect(returnedUser.name).toBe(userData.name);
      expect(returnedUser.email).toBe(userData.email);
      expect(returnedUser.phone).toBe(userData.phone);
      expect(returnedUser.address).toEqual(userData.address);
      expect(returnedUser.role).toBe(userData.role);
    });
  });

  describe("Error handling", () => {
    it("should handle database errors gracefully", async () => {
      const req = mockRequest({
        email: "test@example.com",
        password: "testpass",
      });
      const res = mockResponse();

      // Force database error by closing connection
      await mongoose.connection.close();

      await loginController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Error in login",
        error: expect.any(Error),
      });

      // Reconnect for cleanup
      await dbConnect();
    });

    it("should handle comparePassword errors", async () => {
      await userModel.create({
        name: "Test User",
        email: "test@example.com",
        password: "not-a-bcrypt-hash", // Invalid hash format
        phone: "1234567890",
        address: "123 Main St",
        answer: "Answer",
      });

      const req = mockRequest({
        email: "test@example.com",
        password: "anypassword",
      });
      const res = mockResponse();

      await loginController(req, res);

      // Should catch error and return 500
      expect(res.status).toHaveBeenCalledWith(500);
    });

    it("should handle JWT signing errors", async () => {
      await userModel.create({
        name: "JWT Error Test",
        email: "jwterror@example.com",
        password: await hashPassword("pass123"),
        phone: "1234567890",
        address: "123 Main St",
        answer: "Answer",
      });

      const req = mockRequest({
        email: "jwterror@example.com",
        password: "pass123",
      });
      const res = mockResponse();

      // Remove JWT_SECRET to cause signing error
      const originalSecret = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET;

      await loginController(req, res);

      // Should catch error and return 500
      expect(res.status).toHaveBeenCalledWith(500);

      // Restore secret
      process.env.JWT_SECRET = originalSecret;
    });
  });

  describe("Concurrent login handling", () => {
    it("should handle multiple concurrent logins for same user", async () => {
      await userModel.create({
        name: "Concurrent User",
        email: "concurrent@example.com",
        password: await hashPassword("concurrentpass"),
        phone: "4444444444",
        address: "Concurrent Street",
        answer: "Concurrent Answer",
      });

      const loginPromises = Array.from({ length: 5 }, () => {
        const req = mockRequest({
          email: "concurrent@example.com",
          password: "concurrentpass",
        });
        const res = mockResponse();
        return loginController(req, res).then(() => res);
      });

      const results = await Promise.all(loginPromises);

      // All logins should succeed
      results.forEach((res) => {
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            message: "login successfully",
          })
        );
      });
    });

    it("should handle concurrent logins for different users", async () => {
      // Create multiple users
      await Promise.all([
        userModel.create({
          name: "User A",
          email: "usera@example.com",
          password: await hashPassword("passa"),
          phone: "1111111111",
          address: "Address A",
          answer: "Answer A",
        }),
        userModel.create({
          name: "User B",
          email: "userb@example.com",
          password: await hashPassword("passb"),
          phone: "2222222222",
          address: "Address B",
          answer: "Answer B",
        }),
        userModel.create({
          name: "User C",
          email: "userc@example.com",
          password: await hashPassword("passc"),
          phone: "3333333333",
          address: "Address C",
          answer: "Answer C",
        }),
      ]);

      const loginA = async () => {
        const req = mockRequest({
          email: "usera@example.com",
          password: "passa",
        });
        const res = mockResponse();
        await loginController(req, res);
        return res;
      };

      const loginB = async () => {
        const req = mockRequest({
          email: "userb@example.com",
          password: "passb",
        });
        const res = mockResponse();
        await loginController(req, res);
        return res;
      };

      const loginC = async () => {
        const req = mockRequest({
          email: "userc@example.com",
          password: "passc",
        });
        const res = mockResponse();
        await loginController(req, res);
        return res;
      };

      const [resA, resB, resC] = await Promise.all([
        loginA(),
        loginB(),
        loginC(),
      ]);

      // All should succeed with correct user data
      const sendA = (resA.send as jest.Mock).mock.calls[0][0];
      const sendB = (resB.send as jest.Mock).mock.calls[0][0];
      const sendC = (resC.send as jest.Mock).mock.calls[0][0];

      expect(sendA.user.email).toBe("usera@example.com");
      expect(sendB.user.email).toBe("userb@example.com");
      expect(sendC.user.email).toBe("userc@example.com");
    });
  });
});
