import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { ReviewsService } from "./reviews.service.js";
import { ReviewsController } from "./reviews.controller.js";
import { createReviewSchema, reviewResponseSchema } from "./reviews.schemas.js";

export default async function reviewsRoutes(fastify: FastifyInstance) {
  const server = fastify.withTypeProvider<ZodTypeProvider>();
  const reviewsService = new ReviewsService();
  const reviewsController = new ReviewsController(reviewsService);

  // Rutas públicas
  server.get(
    "/property/:propertyId",
    reviewsController.getPropertyReviews.bind(reviewsController)
  );

  server.get(
    "/user/:userId",
    reviewsController.getUserReviews.bind(reviewsController)
  );

  server.get(
    "/user/:userId/stats",
    reviewsController.getStats.bind(reviewsController)
  );

  // Rutas protegidas
  server.post(
    "/",
    {
      schema: {
        body: createReviewSchema,
        response: {
          200: reviewResponseSchema,
        },
      },
      onRequest: [server.authenticate],
    },
    reviewsController.create.bind(reviewsController)
  );
}
