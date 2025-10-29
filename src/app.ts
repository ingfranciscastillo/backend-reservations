import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import websocket from "@fastify/websocket";
import { config } from "./config/env.js";

export const app = Fastify({ logger: true });

app.register(cors, {
  origin: true,
});
app.register(jwt, {
  secret: config.jwtSecret || "secret-key",
});
app.register(multipart);
app.register(websocket);

app.decorate(
  "authenticate",
  async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.send(err);
    }
  }
);

app.get("/health", async (req, reply) => {
  reply.send({ status: "ok" });
});
