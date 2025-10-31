import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { PaymentsService } from "./payments.service.js";
import { PaymentsController } from "./payments.controller.js";
import { processPaymentSchema } from "./payments.schemas.js";
import { z } from "zod";

export default async function paymentsRoutes(fastify: FastifyInstance) {
  const server = fastify.withTypeProvider<ZodTypeProvider>();
  const paymentsService = new PaymentsService();
  const paymentsController = new PaymentsController(paymentsService);

  // Todas las rutas requieren autenticación
  server.addHook("onRequest", server.authenticate);

  // Procesar pago
  server.post(
    "/process",
    {
      schema: {
        body: processPaymentSchema,
        response: {
          200: {
            type: "object",
            properties: {
              payment: { type: "object" },
            },
          },
        },
      },
    },
    paymentsController.processPayment.bind(paymentsController)
  );

  // Mis pagos (guest ve pagos realizados, host ve pagos recibidos)
  server.get(
    "/my-payments",
    paymentsController.getUserPayments.bind(paymentsController)
  );

  // Ganancias del host por mes
  server.get(
    "/earnings",
    paymentsController.getHostEarnings.bind(paymentsController)
  );

  // Resumen de ganancias del host
  server.get(
    "/earnings/summary",
    paymentsController.getEarningsSummary.bind(paymentsController)
  );

  // Pagos de una propiedad específica
  server.get(
    "/property/:propertyId",
    paymentsController.getPropertyPayments.bind(paymentsController)
  );

  // Detalles de un pago específico
  server.get(
    "/:id",
    paymentsController.getPaymentDetails.bind(paymentsController)
  );

  // Procesar reembolso
  server.post(
    "/:id/refund",
    {
      schema: {
        body: z.object({
          reason: z.string().optional(),
        }),
      },
    },
    paymentsController.refundPayment.bind(paymentsController)
  );
}
