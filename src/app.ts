import Fastify, { fastify } from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import websocket from "@fastify/websocket";

export const app = Fastify();

app.register(cors, {
  origin: true,
});
app.register(jwt, {
  secret: "your-secret-key",
});
app.register(multipart);
app.register(websocket);

app.decorate("authenticate", async (request: any, reply: any) => {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.send(err);
  }
});

app.get("/health", async (req, reply) => {
  reply.send({ status: "ok" });
});
