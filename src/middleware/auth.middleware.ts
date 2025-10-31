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

export const requireRole = (...roles: Array<"guest" | "host" | "admin">) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!roles.includes(request.user.role)) {
      reply.status(403).send({ error: "Permisos insuficientes" });
    }
  };
};
