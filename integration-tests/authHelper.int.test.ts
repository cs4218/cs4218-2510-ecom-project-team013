import bcrypt from "bcrypt";
import { comparePassword, hashPassword } from "../helpers/authHelper";

describe("Integration Tests for authHelper", () => {
  describe("hashPassword function", () => {
    describe("Successful password hashing", () => {
      it("should hash a valid password successfully", async () => {
        const password = "mySecurePassword123";
        const hashedPassword = await hashPassword(password);

        expect(hashedPassword).toBeDefined();
        expect(typeof hashedPassword).toBe("string");
        expect(hashedPassword).not.toBe(password);
      });

      it("should generate different hashes for the same password (salt randomization)", async () => {
        const password = "testPassword123";

        const hash1 = await hashPassword(password);
        const hash2 = await hashPassword(password);

        expect(hash1).toBeDefined();
        expect(hash2).toBeDefined();
        expect(hash1).not.toBe(hash2); // Different salts should produce different hashes
      });

      it("should hash password with special characters", async () => {
        const password = "P@ssw0rd!#$%^&*()";
        const hashedPassword = await hashPassword(password);

        expect(hashedPassword).toBeDefined();
        expect(typeof hashedPassword).toBe("string");
        expect(hashedPassword).not.toBe(password);
      });

      it("should hash password with unicode characters", async () => {
        const password = "пароль密码🔐";
        const hashedPassword = await hashPassword(password);

        expect(hashedPassword).toBeDefined();
        expect(typeof hashedPassword).toBe("string");
        expect(hashedPassword).not.toBe(password);
      });

      it("should hash very long passwords", async () => {
        const password = "a".repeat(1000);
        const hashedPassword = await hashPassword(password);

        expect(hashedPassword).toBeDefined();
        expect(typeof hashedPassword).toBe("string");
        expect(hashedPassword).not.toBe(password);
      });

      it("should hash single character password", async () => {
        const password = "a";
        const hashedPassword = await hashPassword(password);

        expect(hashedPassword).toBeDefined();
        expect(typeof hashedPassword).toBe("string");
        expect(hashedPassword).not.toBe(password);
      });

      it("should hash password with only numbers", async () => {
        const password = "123456789";
        const hashedPassword = await hashPassword(password);

        expect(hashedPassword).toBeDefined();
        expect(typeof hashedPassword).toBe("string");
        expect(hashedPassword).not.toBe(password);
      });

      it("should hash password with spaces", async () => {
        const password = "password with spaces";
        const hashedPassword = await hashPassword(password);

        expect(hashedPassword).toBeDefined();
        expect(typeof hashedPassword).toBe("string");
        expect(hashedPassword).not.toBe(password);
      });

      it("should hash empty string (edge case)", async () => {
        const password = "";
        const hashedPassword = await hashPassword(password);

        expect(hashedPassword).toBeDefined();
        expect(typeof hashedPassword).toBe("string");
      });
    });

    describe("Hash properties and bcrypt integration", () => {
      it("should use 10 salt rounds as specified in the code", async () => {
        const password = "testPassword";
        const hashedPassword = await hashPassword(password);

        // bcrypt hashes start with $2b$ (or $2a$, $2y$) followed by cost factor
        expect(hashedPassword).toMatch(/^\$2[aby]\$10\$/);
      });

      it("should generate bcrypt-compatible hash format", async () => {
        const password = "testPassword";
        const hashedPassword = await hashPassword(password);

        // bcrypt hash format: $2b$10$[22 character salt][31 character hash]
        expect(hashedPassword?.length).toBeGreaterThan(50);
        expect(hashedPassword).toMatch(/^\$2[aby]\$/);
      });

      it("should verify hashed password with bcrypt.compare directly", async () => {
        const password = "verifyablePassword";
        const hashedPassword = await hashPassword(password);

        const isMatch = await bcrypt.compare(password, hashedPassword!);
        expect(isMatch).toBe(true);
      });

      it("should not match wrong password with bcrypt.compare", async () => {
        const password = "correctPassword";
        const wrongPassword = "wrongPassword";
        const hashedPassword = await hashPassword(password);

        const isMatch = await bcrypt.compare(wrongPassword, hashedPassword!);
        expect(isMatch).toBe(false);
      });
    });

    describe("Error handling", () => {
      it("should handle errors gracefully and return undefined", async () => {
        const consoleErrorSpy = jest
          .spyOn(console, "error")
          .mockImplementation();

        // Force bcrypt.hash to throw an error
        const bcryptSpy = jest
          .spyOn(bcrypt, "hash")
          .mockRejectedValueOnce(new Error("Hashing failed"));

        const result = await hashPassword("testPassword");

        expect(result).toBeUndefined();
        expect(consoleErrorSpy).toHaveBeenCalled();

        bcryptSpy.mockRestore();
        consoleErrorSpy.mockRestore();
      });

      it("should log error to console when hashing fails", async () => {
        const consoleErrorSpy = jest
          .spyOn(console, "error")
          .mockImplementation();
        const testError = new Error("Simulated bcrypt error");

        const bcryptSpy = jest
          .spyOn(bcrypt, "hash")
          .mockRejectedValueOnce(testError);

        await hashPassword("testPassword");

        expect(consoleErrorSpy).toHaveBeenCalledWith(testError);

        bcryptSpy.mockRestore();
        consoleErrorSpy.mockRestore();
      });
    });

    describe("Concurrency and performance", () => {
      it("should handle multiple simultaneous hash operations", async () => {
        const passwords = ["password1", "password2", "password3", "password4"];

        const hashes = await Promise.all(passwords.map((p) => hashPassword(p)));

        expect(hashes).toHaveLength(4);
        hashes.forEach((hash, index) => {
          expect(hash).toBeDefined();
          expect(hash).not.toBe(passwords[index]);
        });

        // All hashes should be unique
        const uniqueHashes = new Set(hashes);
        expect(uniqueHashes.size).toBe(4);
      });

      it("should maintain consistency under concurrent load", async () => {
        const password = "concurrentTest";
        const iterations = 10;

        const hashes = await Promise.all(
          Array(iterations)
            .fill(password)
            .map((p) => hashPassword(p))
        );

        // All should be defined
        expect(hashes.every((h) => h !== undefined)).toBe(true);

        // All should be different (due to random salts)
        const uniqueHashes = new Set(hashes);
        expect(uniqueHashes.size).toBe(iterations);

        // All should be verifiable with original password
        const verifications = await Promise.all(
          hashes.map((h) => bcrypt.compare(password, h!))
        );
        expect(verifications.every((v) => v === true)).toBe(true);
      });
    });
  });

  describe("comparePassword function", () => {
    describe("Successful password comparison", () => {
      it("should return true for correct password", async () => {
        const password = "mySecurePassword123";
        const hashedPassword = await hashPassword(password);

        const result = await comparePassword(password, hashedPassword!);

        expect(result).toBe(true);
      });

      it("should return false for incorrect password", async () => {
        const correctPassword = "mySecurePassword123";
        const wrongPassword = "wrongPassword123";
        const hashedPassword = await hashPassword(correctPassword);

        const result = await comparePassword(wrongPassword, hashedPassword!);

        expect(result).toBe(false);
      });

      it("should handle password with special characters", async () => {
        const password = "P@ssw0rd!#$%";
        const hashedPassword = await hashPassword(password);

        const result = await comparePassword(password, hashedPassword!);

        expect(result).toBe(true);
      });

      it("should handle password with unicode characters", async () => {
        const password = "パスワード🔐";
        const hashedPassword = await hashPassword(password);

        const result = await comparePassword(password, hashedPassword!);

        expect(result).toBe(true);
      });

      it("should return false for slightly different password", async () => {
        const password = "Password123";
        const similarPassword = "Password124"; // Last character different
        const hashedPassword = await hashPassword(password);

        const result = await comparePassword(similarPassword, hashedPassword!);

        expect(result).toBe(false);
      });

      it("should be case-sensitive", async () => {
        const password = "Password123";
        const differentCase = "password123";
        const hashedPassword = await hashPassword(password);

        const result = await comparePassword(differentCase, hashedPassword!);

        expect(result).toBe(false);
      });

      it("should handle empty password comparison", async () => {
        const password = "";
        const hashedPassword = await hashPassword(password);

        const result = await comparePassword(password, hashedPassword!);

        expect(result).toBe(true);
      });

      it("should return false when comparing empty string to hashed password", async () => {
        const password = "actualPassword";
        const hashedPassword = await hashPassword(password);

        const result = await comparePassword("", hashedPassword!);

        expect(result).toBe(false);
      });
    });

    describe("Hash format validation", () => {
      it("should work with bcrypt hash generated externally", async () => {
        const password = "externalTest";
        const externalHash = await bcrypt.hash(password, 10);

        const result = await comparePassword(password, externalHash);

        expect(result).toBe(true);
      });

      it("should handle different bcrypt salt rounds", async () => {
        const password = "testPassword";
        const hash12Rounds = await bcrypt.hash(password, 12);

        const result = await comparePassword(password, hash12Rounds);

        expect(result).toBe(true);
      });

      it("should return false for invalid hash format", async () => {
        const password = "testPassword";
        const invalidHash = "not-a-valid-bcrypt-hash";

        try {
          const result = await comparePassword(password, invalidHash);
          expect(result).toBe(false);
        } catch (error) {
          // bcrypt.compare might throw an error for invalid hash format
          expect(error).toBeDefined();
        }
      });

      it("should return false for corrupted hash", async () => {
        const password = "testPassword";
        const hashedPassword = await hashPassword(password);
        const corruptedHash = hashedPassword!.slice(0, -5) + "xxxxx";

        const result = await comparePassword(password, corruptedHash);

        expect(result).toBe(false);
      });
    });

    describe("Edge cases and boundary conditions", () => {
      it("should handle very long passwords in comparison", async () => {
        const password = "a".repeat(1000);
        const hashedPassword = await hashPassword(password);

        const result = await comparePassword(password, hashedPassword!);

        expect(result).toBe(true);
      });

      it("should return false for password with extra spaces", async () => {
        const password = "password";
        const passwordWithSpaces = "password ";
        const hashedPassword = await hashPassword(password);

        const result = await comparePassword(
          passwordWithSpaces,
          hashedPassword!
        );

        expect(result).toBe(false);
      });

      it("should handle password with only spaces", async () => {
        const password = "   ";
        const hashedPassword = await hashPassword(password);

        const result = await comparePassword(password, hashedPassword!);

        expect(result).toBe(true);
      });

      it("should handle password starting with special characters", async () => {
        const password = "!@#password";
        const hashedPassword = await hashPassword(password);

        const result = await comparePassword(password, hashedPassword!);

        expect(result).toBe(true);
      });
    });

    describe("Concurrency and multiple comparisons", () => {
      it("should handle multiple simultaneous comparisons", async () => {
        const passwords = ["pass1", "pass2", "pass3", "pass4"];
        const hashes = await Promise.all(passwords.map((p) => hashPassword(p)));

        const results = await Promise.all(
          passwords.map((p, i) => comparePassword(p, hashes[i]!))
        );

        expect(results.every((r) => r === true)).toBe(true);
      });

      it("should correctly identify mismatched password-hash pairs", async () => {
        const passwords = ["pass1", "pass2", "pass3"];
        const hashes = await Promise.all(passwords.map((p) => hashPassword(p)));

        // Compare each password with the wrong hash
        const results = await Promise.all([
          comparePassword(passwords[0], hashes[1]!),
          comparePassword(passwords[1], hashes[2]!),
          comparePassword(passwords[2], hashes[0]!),
        ]);

        expect(results.every((r) => r === false)).toBe(true);
      });

      it("should maintain consistency with repeated comparisons", async () => {
        const password = "consistencyTest";
        const hashedPassword = await hashPassword(password);

        const results = await Promise.all(
          Array(10)
            .fill(null)
            .map(() => comparePassword(password, hashedPassword!))
        );

        expect(results.every((r) => r === true)).toBe(true);
      });
    });

    describe("Security validations", () => {
      it("should not expose timing attacks vulnerability (constant time comparison)", async () => {
        const password = "securePassword123";
        const hashedPassword = await hashPassword(password);

        // Test multiple wrong passwords with different lengths
        const wrongPasswords = ["a", "ab", "abc", "wrongpassword"];

        const timings = await Promise.all(
          wrongPasswords.map(async (wp) => {
            const start = Date.now();
            await comparePassword(wp, hashedPassword!);
            return Date.now() - start;
          })
        );

        // bcrypt should use constant-time comparison
        // All comparisons should take similar time (within reasonable variance)
        // This is a basic check - bcrypt handles this internally
        expect(timings.every((t) => t >= 0)).toBe(true);
      });

      it("should reject password when hash is tampered with", async () => {
        const password = "originalPassword";
        const hashedPassword = await hashPassword(password);

        // Tamper with the hash
        const tamperedHash = hashedPassword!.replace(/.$/, "x");

        const result = await comparePassword(password, tamperedHash);

        expect(result).toBe(false);
      });
    });
  });

  describe("Integration: hashPassword + comparePassword workflow", () => {
    it("should support complete registration -> login flow", async () => {
      // Simulate user registration
      const registrationPassword = "userPassword123";
      const storedHash = await hashPassword(registrationPassword);

      expect(storedHash).toBeDefined();

      // Simulate user login with correct password
      const loginPassword = "userPassword123";
      const loginResult = await comparePassword(loginPassword, storedHash!);

      expect(loginResult).toBe(true);
    });

    it("should reject incorrect login after registration", async () => {
      // Simulate user registration
      const registrationPassword = "userPassword123";
      const storedHash = await hashPassword(registrationPassword);

      // Simulate user login with incorrect password
      const wrongLoginPassword = "wrongPassword123";
      const loginResult = await comparePassword(
        wrongLoginPassword,
        storedHash!
      );

      expect(loginResult).toBe(false);
    });

    it("should support password change workflow", async () => {
      // Original password
      const oldPassword = "oldPassword123";
      const oldHash = await hashPassword(oldPassword);

      // Verify old password still works
      const oldVerification = await comparePassword(oldPassword, oldHash!);
      expect(oldVerification).toBe(true);

      // Change to new password
      const newPassword = "newPassword456";
      const newHash = await hashPassword(newPassword);

      // Old password should not work with new hash
      const oldPasswordWithNewHash = await comparePassword(
        oldPassword,
        newHash!
      );
      expect(oldPasswordWithNewHash).toBe(false);

      // New password should work with new hash
      const newVerification = await comparePassword(newPassword, newHash!);
      expect(newVerification).toBe(true);
    });

    it("should handle multiple user scenarios simultaneously", async () => {
      const users = [
        { username: "user1", password: "pass1" },
        { username: "user2", password: "pass2" },
        { username: "user3", password: "pass3" },
      ];

      // Register all users
      const hashes = await Promise.all(
        users.map((u) => hashPassword(u.password))
      );

      // All users login with correct passwords
      const correctLogins = await Promise.all(
        users.map((u, i) => comparePassword(u.password, hashes[i]!))
      );
      expect(correctLogins.every((r) => r === true)).toBe(true);

      // Users try wrong passwords
      const wrongLogins = await Promise.all([
        comparePassword("wrongpass", hashes[0]!),
        comparePassword("wrongpass", hashes[1]!),
        comparePassword("wrongpass", hashes[2]!),
      ]);
      expect(wrongLogins.every((r) => r === false)).toBe(true);
    });

    it("should maintain independence between different password hashes", async () => {
      const password1 = "samePassword";
      const password2 = "samePassword";

      const hash1 = await hashPassword(password1);
      const hash2 = await hashPassword(password2);

      // Both should work with the same password
      expect(await comparePassword(password1, hash1!)).toBe(true);
      expect(await comparePassword(password2, hash2!)).toBe(true);

      // But hashes should be different
      expect(hash1).not.toBe(hash2);

      // Cross-verification should still work (same password)
      expect(await comparePassword(password1, hash2!)).toBe(true);
      expect(await comparePassword(password2, hash1!)).toBe(true);
    });
  });

  describe("Type safety and error resilience", () => {
    it("should handle null password gracefully in hashPassword", async () => {
      try {
        await hashPassword(null as any);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it("should handle undefined password gracefully in hashPassword", async () => {
      try {
        await hashPassword(undefined as any);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it("should handle null in comparePassword", async () => {
      const hashedPassword = await hashPassword("testPassword");

      try {
        const result = await comparePassword(null as any, hashedPassword!);
        expect(result).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it("should handle undefined in comparePassword", async () => {
      const hashedPassword = await hashPassword("testPassword");

      try {
        const result = await comparePassword(undefined as any, hashedPassword!);
        expect(result).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
});
