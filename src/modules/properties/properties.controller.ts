import type { FastifyRequest, FastifyReply } from "fastify";
import { PropertiesService } from "./properties.service.js";
import type {
  CreatePropertyInput,
  UpdatePropertyInput,
  SearchPropertiesInput,
} from "./properties.schemas.js";

export class PropertiesController {
  constructor(private propertiesService: PropertiesService) {}

  async create(
    request: FastifyRequest<{ Body: CreatePropertyInput }>,
    reply: FastifyReply
  ) {
    try {
      const property = await this.propertiesService.create(
        request.body,
        request.user.id
      );
      return { property };
    } catch (error) {
      return reply.status(400).send({
        error: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  }

  async search(
    request: FastifyRequest<{ Querystring: SearchPropertiesInput }>,
    reply: FastifyReply
  ) {
    try {
      const { latitude, longitude, radius, ...filters } = request.query;

      const properties = await this.propertiesService.searchNearby(
        latitude,
        longitude,
        radius,
        filters
      );

      return { properties, count: properties.length };
    } catch (error) {
      return reply.status(500).send({
        error: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  }

  async getById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    try {
      const property = await this.propertiesService.getById(request.params.id);

      if (!property) {
        return reply.status(404).send({ error: "Propiedad no encontrada" });
      }

      return { property };
    } catch (error) {
      return reply.status(500).send({
        error: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  }

  async update(
    request: FastifyRequest<{
      Params: { id: string };
      Body: UpdatePropertyInput;
    }>,
    reply: FastifyReply
  ) {
    try {
      const property = await this.propertiesService.update(
        request.params.id,
        request.user.id,
        request.body
      );
      return { property };
    } catch (error) {
      return reply.status(400).send({
        error: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  }

  async delete(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    try {
      await this.propertiesService.delete(request.params.id, request.user.id);
      return { success: true };
    } catch (error) {
      return reply.status(400).send({
        error: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  }
}
