import type { FastifyRequest, FastifyReply } from "fastify";

export const authenticate = async (
  req: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    await req.jwtVerify();
  } catch (error) {
    reply.status(401).send({ error: "No autorizado" });
  }
};
