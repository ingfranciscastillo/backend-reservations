import type { FastifyRequest, FastifyReply } from "fastify";
import { VerificationService } from "./verification.service.js";
import type {
  SubmitVerificationInput,
  ApproveVerificationInput,
  RejectVerificationInput,
} from "./verification.schemas.js";

export class VerificationController {
  constructor(private verificationService: VerificationService) {}

  async submitVerification(
    request: FastifyRequest<{ Body: SubmitVerificationInput }>,
    reply: FastifyReply
  ) {
    try {
      const verification = await this.verificationService.submitVerification(
        request.body,
        request.user.id
      );
      return { verification };
    } catch (error) {
      return reply.status(400).send({
        error: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  }

  async getStatus(request: FastifyRequest, reply: FastifyReply) {
    try {
      const verification = await this.verificationService.getVerificationStatus(
        request.user.id
      );
      return { verification };
    } catch (error) {
      return reply.status(500).send({
        error: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  }

  async approve(
    request: FastifyRequest<{
      Params: { id: string };
      Body: ApproveVerificationInput;
    }>,
    reply: FastifyReply
  ) {
    try {
      const verification = await this.verificationService.approveVerification(
        request.params.id,
        request.user.id
      );
      return { verification };
    } catch (error) {
      return reply.status(400).send({
        error: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  }

  async reject(
    request: FastifyRequest<{
      Params: { id: string };
      Body: RejectVerificationInput;
    }>,
    reply: FastifyReply
  ) {
    try {
      const verification = await this.verificationService.rejectVerification(
        request.params.id,
        request.body
      );
      return { verification };
    } catch (error) {
      return reply.status(400).send({
        error: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  }

  async getPending(request: FastifyRequest, reply: FastifyReply) {
    try {
      const verifications =
        await this.verificationService.getPendingVerifications();
      return { verifications, count: verifications.length };
    } catch (error) {
      return reply.status(500).send({
        error: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  }
}
