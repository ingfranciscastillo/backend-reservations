import type { FastifyRequest, FastifyReply } from "fastify";
import { AuthService } from "./auth.services.js";
import type {
  RegisterInput,
  LoginInput,
  UpdateProfileInput,
} from "./auth.schemas.js";

export class AuthController {
  constructor(private authService: AuthService) {}

  async register(
    request: FastifyRequest<{ Body: RegisterInput }>,
    reply: FastifyReply
  ) {
    try {
      const user = await this.authService.register(request.body);
      const token = await reply.jwtSign({
        id: user.id,
        email: user.email,
        role: user.role,
      });

      return { user, token };
    } catch (error) {
      reply.status(400).send({
        error: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  }

  async login(
    request: FastifyRequest<{ Body: LoginInput }>,
    reply: FastifyReply
  ) {
    try {
      const user = await this.authService.login(request.body);
      const token = await reply.jwtSign({
        id: user.id,
        email: user.email,
        role: user.role,
      });

      return { user, token };
    } catch (error) {
      reply.status(401).send({
        error: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  }

  async getProfile(request: FastifyRequest, reply: FastifyReply) {
    const user = await this.authService.getProfile(request.user.id);

    if (!user) {
      return reply.status(404).send({ error: "Usuario no encontrado" });
    }

    return { user };
  }

  async updateProfile(
    request: FastifyRequest<{ Body: UpdateProfileInput }>,
    reply: FastifyReply
  ) {
    try {
      const user = await this.authService.updateProfile(
        request.user.id,
        request.body
      );
      return { user };
    } catch (error) {
      reply.status(400).send({
        error: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  }
}
