import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { build } from "../../app";
import { db } from "../../config/db/index";
import { users } from "../../config/db/schema";
import { eq } from "drizzle-orm";

describe("Chat Module", () => {
  let app: Awaited<ReturnType<typeof build>>;
  let user1Token: string;
  let user2Token: string;
  let user1Id: string;
  let user2Id: string;

  beforeAll(async () => {
    app = await build();

    const user1Auth = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: {
        email: "chat-user1@example.com",
        password: "User1Pass123",
        firstName: "Chat",
        lastName: "User1",
      },
    });

    user1Token = user1Auth.json().token;
    user1Id = user1Auth.json().user.id;

    const user2Auth = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: {
        email: "chat-user2@example.com",
        password: "User2Pass123",
        firstName: "Chat",
        lastName: "User2",
      },
    });

    user2Token = user2Auth.json().token;
    user2Id = user2Auth.json().user.id;
  });

  afterAll(async () => {
    await db.delete(users).where(eq(users.id, user1Id));
    await db.delete(users).where(eq(users.id, user2Id));
    await app.close();
  });

  it("should send a message", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/chat/messages",
      headers: {
        authorization: `Bearer ${user1Token}`,
      },
      payload: {
        receiverId: user2Id,
        content: "Hello! How are you?",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().message).toHaveProperty("id");
    expect(response.json().message.content).toBe("Hello! How are you?");
  });

  it("should get conversation", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/api/chat/conversation?otherUserId=${user2Id}`,
      headers: {
        authorization: `Bearer ${user1Token}`,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().messages).toBeInstanceOf(Array);
  });

  it("should fail with empty message", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/chat/messages",
      headers: {
        authorization: `Bearer ${user1Token}`,
      },
      payload: {
        receiverId: user2Id,
        content: "", // Mensaje vacío
      },
    });

    expect(response.statusCode).toBe(400);
  });
});
