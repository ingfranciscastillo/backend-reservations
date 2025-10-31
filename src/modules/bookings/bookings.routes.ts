import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { BookingsService } from "./bookings.service.js";
import { BookingsController } from "./bookings.controller.js";
import {
  createBookingSchema,
  updateBookingStatusSchema,
  bookingResponseSchema,
} from "./bookings.schemas.js";

export default async function bookingsRoutes(fastify: FastifyInstance) {
  const server = fastify.withTypeProvider<ZodTypeProvider>();
  const bookingsService = new BookingsService();
  const bookingsController = new BookingsController(bookingsService);

  server.addHook("onRequest", server.authenticate);

  server.post(
    "/",
    {
      schema: {
        body: createBookingSchema,
        response: {
          200: bookingResponseSchema,
        },
      },
    },
    bookingsController.create.bind(bookingsController)
  );

  server.get(
    "/my-bookings",
    bookingsController.getUserBookings.bind(bookingsController)
  );

  server.get("/:id", bookingsController.getById.bind(bookingsController));

  server.patch(
    "/:id/status",
    {
      schema: {
        body: updateBookingStatusSchema,
      },
    },
    bookingsController.updateStatus.bind(bookingsController)
  );
}
