import "fastify";

declare module "fastify" {
  interface FastifyRequest {
    user: {
      id: string;
      email: string;
      roles: "admin" | "user" | "guest";
    };
  }
}
