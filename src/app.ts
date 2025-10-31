"use strict";

import Fastify from "fastify";
import fastifyCors from "@fastify/cors";
import fastifyJWT from "@fastify/jwt";
import fastifyMultipart from "@fastify/multipart";
import fastifyWebsocket from "@fastify/websocket";
import {
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import { authenticate } from "./middleware/auth.middleware.js";
import { config } from "./config/env.js";

// rutas
import authRoutes from "./modules/auth/auth.routes.js";
import propertiesRoutes from "./modules/properties/properties.routes.js";
import { errorHandler } from "./middleware/error.middleware.js";
import bookingsRoutes from "./modules/bookings/bookings.routes.js";

export async function build(opts = {}) {
  const app = Fastify({
    logger:
      config.nodeEnv === "development"
        ? {
            transport: {
              target: "pino-pretty",
              options: {
                translateTime: "HH:MM:ss Z",
                ignore: "pid,hostname",
              },
            },
          }
        : true,
  });

  // Configurar Zod
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(fastifyCors, {
    origin: config.nodeEnv === "production" ? ["https://tu-dominio.com"] : true,
    credentials: true,
  });
  await app.register(fastifyJWT, {
    secret: config.jwtSecret || "secret-key",
    sign: {
      expiresIn: "7d",
    },
  });
  await app.register(fastifyWebsocket);
  await app.register(fastifyMultipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
  });
  app.decorate("authenticate", authenticate);

  app.get("/health", async (req, reply) => {
    reply.send({ status: "ok" });
  });

  // Root
  app.get("/", async () => {
    return {
      name: "Reservations Backend API",
      version: "1.0.0",
      endpoints: {
        auth: "/api/auth",
        properties: "/api/properties",
        bookings: "/api/bookings",
        reviews: "/api/reviews",
        payments: "/api/payments",
        chat: "/api/chat",
        verification: "/api/verification",
      },
    };
  });

  // módulos
  await app.register(authRoutes, { prefix: "/api/auth" });
  await app.register(propertiesRoutes, { prefix: "/api/properties" });
  await app.register(bookingsRoutes, { prefix: "/api/bookings" });

  app.setErrorHandler(errorHandler);

  // 404 Handler
  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      error: "Ruta no encontrada",
      statusCode: 404,
      url: request.url,
    });
  });

  return app;
}
