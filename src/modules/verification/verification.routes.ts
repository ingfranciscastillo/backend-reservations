import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { VerificationService } from "./verification.service.js";
import { VerificationController } from "./verification.controller.js";
import { requireRole } from "../../middleware/auth.middleware.js";
import {
  submitVerificationSchema,
  approveVerificationSchema,
  rejectVerificationSchema,
} from "./verification.schemas.js";

export default async function verificationRoutes(fastify: FastifyInstance) {
  const server = fastify.withTypeProvider<ZodTypeProvider>();
  const verificationService = new VerificationService();
  const verificationController = new VerificationController(
    verificationService
  );

  // Todas las rutas requieren autenticación
  server.addHook("onRequest", server.authenticate);

  server.post(
    "/submit",
    {
      schema: {
        body: submitVerificationSchema,
      },
    },
    verificationController.submitVerification.bind(verificationController)
  );

  server.get(
    "/status",
    verificationController.getStatus.bind(verificationController)
  );

  // Rutas de admin
  server.get(
    "/pending",
    {
      onRequest: [requireRole("admin")],
    },
    verificationController.getPending.bind(verificationController)
  );

  server.post(
    "/:id/approve",
    {
      schema: {
        body: approveVerificationSchema,
      },
      onRequest: [requireRole("admin")],
    },
    verificationController.approve.bind(verificationController)
  );

  server.post(
    "/:id/reject",
    {
      schema: {
        body: rejectVerificationSchema,
      },
      onRequest: [requireRole("admin")],
    },
    verificationController.reject.bind(verificationController)
  );
}
