import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { PropertiesService } from "./properties.service.js";
import { PropertiesController } from "./properties.controller.js";
import {
  createPropertySchema,
  updatePropertySchema,
  searchPropertiesSchema,
} from "./properties.schemas.js";

export default async function propertiesRoutes(fastify: FastifyInstance) {
  const server = fastify.withTypeProvider<ZodTypeProvider>();
  const propertiesService = new PropertiesService();
  const propertiesController = new PropertiesController(propertiesService);

  // Búsqueda pública
  server.get(
    "/search",
    {
      schema: {
        querystring: searchPropertiesSchema,
      },
    },
    propertiesController.search.bind(propertiesController)
  );

  server.get("/:id", propertiesController.getById.bind(propertiesController));

  // Rutas protegidas
  server.post(
    "/",
    {
      schema: {
        body: createPropertySchema,
      },
      onRequest: [server.authenticate],
    },
    propertiesController.create.bind(propertiesController)
  );

  server.put(
    "/:id",
    {
      schema: {
        body: updatePropertySchema,
      },
      onRequest: [server.authenticate],
    },
    propertiesController.update.bind(propertiesController)
  );

  server.delete(
    "/:id",
    {
      onRequest: [server.authenticate],
    },
    propertiesController.delete.bind(propertiesController)
  );
}
