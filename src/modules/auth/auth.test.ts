import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { build } from "../../app";
import { db } from "../../config/db/index";
import { users } from "../../config/db/schema";
import { eq } from "drizzle-orm";

describe("Auth Module", () => {
  let app: Awaited<ReturnType<typeof build>>;

  beforeAll(async () => {
    app = await build();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Limpiar datos de prueba
    await db.delete(users).where(eq(users.email, "test@example.com"));
  });

  it("should register a new user with valid data", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: {
        email: "test@example.com",
        password: "SecurePass123",
        firstName: "Test",
        lastName: "User",
      },
    });

    expect(response.statusCode).toBe(200);
    const json = response.json();

    expect(json).toHaveProperty("token");
    expect(json.user).toMatchObject({
      email: "test@example.com",
      firstName: "Test",
      lastName: "User",
    });

    // Verificar en DB
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, "test@example.com"));

    expect(user).toBeDefined();
    expect(user.firstName).toBe("Test");
  });

  it("should fail with invalid email", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: {
        email: "invalid-email", // Email inválido
        password: "SecurePass123",
        firstName: "Test",
        lastName: "User",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toHaveProperty("message");
  });

  it("should fail with short password", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: {
        email: "test@example.com",
        password: "123", // Muy corta
        firstName: "Test",
        lastName: "User",
      },
    });

    expect(response.statusCode).toBe(400);
  });
});
