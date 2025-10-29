import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { AuthService } from "./auth.services.js";
import { AuthController } from "./auth.controller.js";
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
} from "./auth.schemas.js";

export default async function authRoutes(fastify: FastifyInstance) {
  const server = fastify.withTypeProvider<ZodTypeProvider>();
  const authService = new AuthService();
  const authController = new AuthController(authService);

  // Register
  server.post(
    "/register",
    {
      schema: {
        body: registerSchema,
        response: {
          200: {
            type: "object",
            properties: {
              user: { type: "object" },
              token: { type: "string" },
            },
          },
        },
      },
    },
    authController.register.bind(authController)
  );

  // Login
  server.post(
    "/login",
    {
      schema: {
        body: loginSchema,
        response: {
          200: {
            type: "object",
            properties: {
              user: { type: "object" },
              token: { type: "string" },
            },
          },
        },
      },
    },
    authController.login.bind(authController)
  );

  // Get Profile (protected)
  server.get(
    "/profile",
    {
      onRequest: [server.authenticate],
    },
    authController.getProfile.bind(authController)
  );

  // Update Profile (protected)
  server.patch(
    "/profile",
    {
      schema: {
        body: updateProfileSchema,
      },
      onRequest: [server.authenticate],
    },
    authController.updateProfile.bind(authController)
  );
}
