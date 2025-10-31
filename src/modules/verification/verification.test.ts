import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from "vitest";
import { build } from "../../app";
import { db } from "../../config/db/index";
import { users, verifications } from "../../config/db/schema";
import { eq } from "drizzle-orm";

describe("Verification Module", () => {
  let app: Awaited<ReturnType<typeof build>>;
  let userToken: string;
  let userId: string;
  let adminToken: string;
  let adminId: string;
  let verificationId: string;

  beforeAll(async () => {
    app = await build();

    // Crear usuario normal
    const userAuth = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: {
        email: "verification-user@example.com",
        password: "UserPass123",
        firstName: "Verify",
        lastName: "User",
      },
    });

    const userJson = userAuth.json();
    userToken = userJson.token;
    userId = userJson.user.id;

    // Crear admin (normalmente se hace por script o migración)
    const adminAuth = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: {
        email: "verification-admin@example.com",
        password: "AdminPass123",
        firstName: "Admin",
        lastName: "User",
        role: "host", // Usamos host como proxy de admin
      },
    });

    const adminJson = adminAuth.json();
    adminId = adminJson.user.id;

    // Actualizar a admin en la DB
    await db.update(users).set({ role: "admin" }).where(eq(users.id, adminId));

    // Generar nuevo token con el rol de admin
    adminToken = await app.jwt.sign({
      id: adminId,
      email: "verification-admin@example.com",
      role: "admin",
    });
  });

  afterAll(async () => {
    // Cleanup
    await db.delete(verifications).where(eq(verifications.userId, userId));
    await db.delete(users).where(eq(users.id, userId));
    await db.delete(users).where(eq(users.id, adminId));
    await app.close();
  });

  describe("POST /api/verification/submit", () => {
    it("should submit verification with valid documents", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/verification/submit",
        headers: {
          authorization: `Bearer ${userToken}`,
        },
        payload: {
          documentType: "passport",
          documentNumber: "ABC123456",
          documentFrontUrl: "https://example.com/passport-front.jpg",
          documentBackUrl: "https://example.com/passport-back.jpg",
          selfieUrl: "https://example.com/selfie.jpg",
        },
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.verification).toHaveProperty("id");
      expect(json.verification.status).toBe("pending");
      expect(json.verification.documentType).toBe("passport");

      verificationId = json.verification.id;
    });

    it("should fail without authentication", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/verification/submit",
        payload: {
          documentType: "id_card",
          documentFrontUrl: "https://example.com/id-front.jpg",
          selfieUrl: "https://example.com/selfie.jpg",
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it("should fail with invalid document URL", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/verification/submit",
        headers: {
          authorization: `Bearer ${userToken}`,
        },
        payload: {
          documentType: "passport",
          documentFrontUrl: "invalid-url", // URL inválida
          selfieUrl: "https://example.com/selfie.jpg",
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should fail with missing required fields", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/verification/submit",
        headers: {
          authorization: `Bearer ${userToken}`,
        },
        payload: {
          documentType: "passport",
          documentFrontUrl: "https://example.com/front.jpg",
          // Falta selfieUrl
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should fail when submitting duplicate verification", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/verification/submit",
        headers: {
          authorization: `Bearer ${userToken}`,
        },
        payload: {
          documentType: "passport",
          documentFrontUrl: "https://example.com/new-front.jpg",
          selfieUrl: "https://example.com/new-selfie.jpg",
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error).toContain("verificación en proceso");
    });
  });

  describe("GET /api/verification/status", () => {
    it("should get verification status", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/verification/status",
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.verification).toHaveProperty("status");
      expect(json.verification.status).toBe("pending");
    });

    it("should fail without authentication", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/verification/status",
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("GET /api/verification/pending (Admin)", () => {
    it("should get pending verifications as admin", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/verification/pending",
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.verifications).toBeInstanceOf(Array);
      expect(json).toHaveProperty("count");
    });

    it("should fail as non-admin", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/verification/pending",
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe("POST /api/verification/:id/approve (Admin)", () => {
    it("should approve verification as admin", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/api/verification/${verificationId}/approve`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          notes: "Documents verified successfully",
        },
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.verification.status).toBe("approved");
      expect(json.verification).toHaveProperty("verifiedAt");

      // Verificar que el usuario fue marcado como verificado
      const [user] = await db.select().from(users).where(eq(users.id, userId));

      expect(user.verified).toBe(true);
    });

    it("should fail as non-admin", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/api/verification/${verificationId}/approve`,
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe("POST /api/verification/:id/reject (Admin)", () => {
    let newUserId: string;
    let newUserToken: string;
    let newVerificationId: string;

    beforeEach(async () => {
      // Crear nuevo usuario para rechazar
      const userAuth = await app.inject({
        method: "POST",
        url: "/api/auth/register",
        payload: {
          email: `reject-test-${Date.now()}@example.com`,
          password: "TestPass123",
          firstName: "Reject",
          lastName: "Test",
        },
      });

      newUserToken = userAuth.json().token;
      newUserId = userAuth.json().user.id;

      // Crear verificación
      const verifyResponse = await app.inject({
        method: "POST",
        url: "/api/verification/submit",
        headers: {
          authorization: `Bearer ${newUserToken}`,
        },
        payload: {
          documentType: "id_card",
          documentFrontUrl: "https://example.com/id-front.jpg",
          selfieUrl: "https://example.com/selfie.jpg",
        },
      });

      newVerificationId = verifyResponse.json().verification.id;
    });

    afterEach(async () => {
      await db.delete(verifications).where(eq(verifications.userId, newUserId));
      await db.delete(users).where(eq(users.id, newUserId));
    });

    it("should reject verification as admin", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/api/verification/${newVerificationId}/reject`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          reason: "Document is not clear enough",
        },
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.verification.status).toBe("rejected");
    });

    it("should fail rejection without reason", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/api/verification/${newVerificationId}/reject`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          reason: "Short", // Menos de 10 caracteres
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should fail as non-admin", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/api/verification/${newVerificationId}/reject`,
        headers: {
          authorization: `Bearer ${userToken}`,
        },
        payload: {
          reason: "I want to reject this",
        },
      });

      expect(response.statusCode).toBe(403);
    });
  });
});
