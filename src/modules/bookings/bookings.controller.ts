import type { FastifyRequest, FastifyReply } from "fastify";
import { BookingsService } from "./bookings.service.js";
import type {
  CreateBookingInput,
  UpdateBookingStatusInput,
} from "./bookings.schemas.js";

export class BookingsController {
  constructor(private bookingsService: BookingsService) {}

  async create(
    request: FastifyRequest<{ Body: CreateBookingInput }>,
    reply: FastifyReply
  ) {
    try {
      const booking = await this.bookingsService.create(
        request.body,
        request.user.id
      );
      return { booking };
    } catch (error) {
      return reply.status(400).send({
        error: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  }

  async getById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    try {
      const booking = await this.bookingsService.getById(request.params.id);

      if (!booking) {
        return reply.status(404).send({ error: "Reserva no encontrada" });
      }

      return { booking };
    } catch (error) {
      return reply.status(500).send({
        error: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  }

  async getUserBookings(request: FastifyRequest, reply: FastifyReply) {
    try {
      const bookings = await this.bookingsService.getUserBookings(
        request.user.id,
        request.user.role
      );
      return { bookings, count: bookings.length };
    } catch (error) {
      return reply.status(500).send({
        error: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  }

  async updateStatus(
    request: FastifyRequest<{
      Params: { id: string };
      Body: UpdateBookingStatusInput;
    }>,
    reply: FastifyReply
  ) {
    try {
      const booking = await this.bookingsService.updateStatus(
        request.params.id,
        request.user.id,
        request.body
      );
      return { booking };
    } catch (error) {
      return reply.status(400).send({
        error: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  }
}
