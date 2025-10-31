import type { FastifyRequest, FastifyReply } from "fastify";
import { PaymentsService } from "./payments.service.js";
import type { ProcessPaymentInput } from "./payments.schemas.js";

export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  async processPayment(
    request: FastifyRequest<{ Body: ProcessPaymentInput }>,
    reply: FastifyReply
  ) {
    try {
      const payment = await this.paymentsService.processPayment(
        request.body,
        request.user.id
      );
      return { payment };
    } catch (error) {
      return reply.status(400).send({
        error: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  }

  async getPaymentDetails(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    try {
      const payment = await this.paymentsService.getPaymentDetails(
        request.params.id,
        request.user.id
      );
      return { payment };
    } catch (error) {
      return reply.status(404).send({
        error: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  }

  async getUserPayments(request: FastifyRequest, reply: FastifyReply) {
    try {
      const payments = await this.paymentsService.getUserPayments(
        request.user.id,
        request.user.role
      );
      return { payments, count: payments.length };
    } catch (error) {
      return reply.status(500).send({
        error: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  }

  async getHostEarnings(
    request: FastifyRequest<{
      Querystring: { startDate?: string; endDate?: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { startDate, endDate } = request.query;
      const earnings = await this.paymentsService.getHostEarnings(
        request.user.id,
        startDate || "2020-01-01",
        endDate || new Date().toISOString().split("T")[0]
      );
      return { earnings };
    } catch (error) {
      return reply.status(500).send({
        error: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  }

  async getEarningsSummary(request: FastifyRequest, reply: FastifyReply) {
    try {
      const summary = await this.paymentsService.getEarningsSummary(
        request.user.id
      );
      return { summary };
    } catch (error) {
      return reply.status(500).send({
        error: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  }

  async getPropertyPayments(
    request: FastifyRequest<{ Params: { propertyId: string } }>,
    reply: FastifyReply
  ) {
    try {
      const payments = await this.paymentsService.getPropertyPayments(
        request.params.propertyId,
        request.user.id
      );
      return { payments, count: payments.length };
    } catch (error) {
      return reply.status(403).send({
        error: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  }

  async refundPayment(
    request: FastifyRequest<{
      Params: { id: string };
      Body: { reason?: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const payment = await this.paymentsService.refundPayment(
        request.params.id,
        request.user.id,
        request.body.reason
      );
      return { payment, message: "Reembolso procesado exitosamente" };
    } catch (error) {
      return reply.status(400).send({
        error: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  }
}
