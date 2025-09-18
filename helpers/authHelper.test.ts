import bcrypt from "bcrypt";
import { hashPassword, comparePassword } from "./authHelper";

// Mock bcrypt module
jest.mock("bcrypt");
const mockedHash = bcrypt.hash as jest.Mock;
const mockedCompare = bcrypt.compare as jest.Mock;

describe("authHelper", () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    // Set up console.error spy for all tests that need it
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("hashPassword", () => {
    const mockPassword: string = "testPassword123";
    const mockHashedPassword: string = "$2b$10$hashedPasswordExample";

    describe("successful hashing", () => {
      it("should return a hashed password different from original", async () => {
        mockedHash.mockResolvedValue(mockHashedPassword);

        const result = await hashPassword(mockPassword);

        expect(result).toBe(mockHashedPassword);
        expect(result).not.toBe(mockPassword);
      });

      it("should call bcrypt.hash with correct parameters", async () => {
        mockedHash.mockResolvedValue(mockHashedPassword);

        await hashPassword(mockPassword);

        expect(mockedHash).toHaveBeenCalledWith(mockPassword, 10);
        expect(mockedHash).toHaveBeenCalledTimes(1);
      });

      it("should handle empty string password", async () => {
        const emptyPassword: string = "";
        const emptyPasswordHash: string = "$2b$10$emptyHash";
        mockedHash.mockResolvedValue(emptyPasswordHash);

        const result = await hashPassword(emptyPassword);

        expect(mockedHash).toHaveBeenCalledWith(emptyPassword, 10);
        expect(result).toBe(emptyPasswordHash);
      });

      it("should handle very long passwords", async () => {
        const longPassword: string = "a".repeat(1000);
        const longPasswordHash: string = "$2b$10$longPasswordHash";
        mockedHash.mockResolvedValue(longPasswordHash);

        const result = await hashPassword(longPassword);

        expect(result).toBe(longPasswordHash);
      });

      it("should handle special characters in password", async () => {
        const specialPassword = "p@$$w0rd!@#$%^&*()";
        const specialPasswordHash = "$2b$10$specialPasswordHash";
        mockedHash.mockResolvedValue(specialPasswordHash);

        const result = await hashPassword(specialPassword);

        expect(result).toBe(specialPasswordHash);
      });
    });

    describe("error handling", () => {
      it("should return undefined and log error when bcrypt.hash rejects", async () => {
        const mockError = new Error("Bcrypt hashing failed");
        mockedHash.mockRejectedValue(mockError);

        const result = await hashPassword(mockPassword);

        expect(consoleErrorSpy).toHaveBeenCalledWith(mockError);
        expect(result).toBeUndefined();
      });

      it("should return undefined and log error for synchronous bcrypt failures", async () => {
        const mockError = new Error("Synchronous error");
        mockedHash.mockImplementation(() => {
          throw mockError;
        });

        const result = await hashPassword(mockPassword);

        expect(consoleErrorSpy).toHaveBeenCalledWith(mockError);
        expect(result).toBeUndefined();
      });

      it("should return undefined and log non-Error exceptions", async () => {
        const mockError = "String error";
        mockedHash.mockRejectedValue(mockError);

        const result = await hashPassword(mockPassword);

        expect(consoleErrorSpy).toHaveBeenCalledWith(mockError);
        expect(result).toBeUndefined();
      });
    });
  });

  describe("comparePassword", () => {
    const mockPassword: string = "testPassword123";
    const mockHashedPassword: string = "$2b$10$hashedPasswordExample";

    describe("successful comparison", () => {
      it("should return true for matching password and hash", async () => {
        mockedCompare.mockResolvedValue(true);

        const result = await comparePassword(mockPassword, mockHashedPassword);

        expect(result).toBe(true);
      });

      it("should return false for non-matching password", async () => {
        const wrongPassword = "wrongPassword";
        mockedCompare.mockResolvedValue(false);

        const result = await comparePassword(wrongPassword, mockHashedPassword);

        expect(result).toBe(false);
      });

      it("should call bcrypt.compare with correct parameters", async () => {
        mockedCompare.mockResolvedValue(true);

        await comparePassword(mockPassword, mockHashedPassword);

        expect(mockedCompare).toHaveBeenCalledWith(
          mockPassword,
          mockHashedPassword
        );
        expect(mockedCompare).toHaveBeenCalledTimes(1);
      });

      it("should handle empty password", async () => {
        const emptyPassword = "";
        mockedCompare.mockResolvedValue(false);

        const result = await comparePassword(emptyPassword, mockHashedPassword);

        expect(result).toBe(false);
      });

      it("should handle empty hash", async () => {
        const emptyHash = "";
        mockedCompare.mockResolvedValue(false);

        const result = await comparePassword(mockPassword, emptyHash);

        expect(result).toBe(false);
      });

      it("should handle both empty password and hash", async () => {
        mockedCompare.mockResolvedValue(false);
        const result = await comparePassword("", "");
        expect(result).toBe(false);
      });
    });

    describe("invalid inputs (bypassing TypeScript)", () => {
      it("should handle null password", async () => {
        mockedCompare.mockResolvedValue(false);

        // @ts-expect-error - Testing runtime behavior with invalid input
        const result = await comparePassword(null, mockHashedPassword);
        expect(result).toBe(false);
      });

      it("should handle undefined password", async () => {
        mockedCompare.mockResolvedValue(false);

        // @ts-expect-error - Testing runtime behavior with invalid input
        const result = await comparePassword(undefined, mockHashedPassword);
        expect(result).toBe(false);
      });

      it("should handle null hash", async () => {
        mockedCompare.mockResolvedValue(false);

        // @ts-expect-error - Testing runtime behavior with invalid input
        const result = await comparePassword(mockPassword, null);
        expect(result).toBe(false);
      });

      it("should handle undefined hash", async () => {
        mockedCompare.mockResolvedValue(false);

        // @ts-expect-error - Testing runtime behavior with invalid input
        const result = await comparePassword(mockPassword, undefined);
        expect(result).toBe(false);
      });
    });

    describe("error handling", () => {
      it("should handle malformed hash", async () => {
        const malformedHash = "notAValidBcryptHash";
        const mockError = new Error("Invalid hash format");
        mockedCompare.mockRejectedValue(mockError);

        await expect(
          comparePassword(mockPassword, malformedHash)
        ).rejects.toThrow("Invalid hash format");
      });

      it("should propagate bcrypt.compare errors", async () => {
        const mockError = new Error("Bcrypt comparison failed");
        mockedCompare.mockRejectedValue(mockError);

        await expect(
          comparePassword(mockPassword, mockHashedPassword)
        ).rejects.toThrow("Bcrypt comparison failed");
      });

      it("should propagate synchronous errors", async () => {
        const mockError = new Error("Synchronous error");
        mockedCompare.mockImplementation(() => {
          throw mockError;
        });

        await expect(
          comparePassword(mockPassword, mockHashedPassword)
        ).rejects.toThrow("Synchronous error");
      });

      it("should propagate non-Error exceptions", async () => {
        const stringError = "String error from bcrypt";
        mockedCompare.mockRejectedValue(stringError);

        await expect(
          comparePassword(mockPassword, mockHashedPassword)
        ).rejects.toBe(stringError);
      });
    });
  });
});
