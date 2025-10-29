import type { FastifyReply, FastifyRequest, FastifyError } from "fastify";

export const errorHandler = (
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) => {
  request.log.error(error);

  const statusCode = error.statusCode || 500;
  const message = error.message || "Error interno del servidor";

  reply.status(statusCode).send({
    error: message,
    statusCode,
  });
};
