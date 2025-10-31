import type { FastifyRequest, FastifyReply } from "fastify";
import { ReviewsService } from "./reviews.service.js";
import type { CreateReviewInput } from "./reviews.schemas.js";

export class ReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  async create(
    request: FastifyRequest<{ Body: CreateReviewInput }>,
    reply: FastifyReply
  ) {
    try {
      const review = await this.reviewsService.create(
        request.body,
        request.user.id
      );
      return { review };
    } catch (error) {
      return reply.status(400).send({
        error: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  }

  async getPropertyReviews(
    request: FastifyRequest<{ Params: { propertyId: string } }>,
    reply: FastifyReply
  ) {
    try {
      const reviews = await this.reviewsService.getPropertyReviews(
        request.params.propertyId
      );
      return { reviews, count: reviews.length };
    } catch (error) {
      return reply.status(500).send({
        error: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  }

  async getUserReviews(
    request: FastifyRequest<{ Params: { userId: string } }>,
    reply: FastifyReply
  ) {
    try {
      const reviews = await this.reviewsService.getUserReviews(
        request.params.userId
      );
      return { reviews, count: reviews.length };
    } catch (error) {
      return reply.status(500).send({
        error: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  }

  async getStats(
    request: FastifyRequest<{ Params: { userId: string } }>,
    reply: FastifyReply
  ) {
    try {
      const stats = await this.reviewsService.getStats(request.params.userId);
      return { stats };
    } catch (error) {
      return reply.status(500).send({
        error: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  }
}
