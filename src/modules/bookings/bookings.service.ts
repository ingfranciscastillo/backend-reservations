import { db } from "../../config/db/index.js";
import {
  bookings,
  properties,
  users,
  type Booking,
} from "../../config/db/schema.js";
import { eq, and, or, gte, lte, ne, sql } from "drizzle-orm";
import type {
  CreateBookingInput,
  UpdateBookingStatusInput,
} from "./bookings.schemas.js";

const getDaysBetween = (start: string, end: string): number => {
  const diffTime = Math.abs(
    new Date(end).getTime() - new Date(start).getTime()
  );
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export interface BookingWithDetails extends Booking {
  propertyTitle: string;
  propertyAddress: string;
  propertyImages: string[];
  hostName: string;
  hostEmail: string;
  guestName: string;
  guestEmail: string;
}

export class BookingsService {
  async create(
    bookingData: CreateBookingInput,
    guestId: string
  ): Promise<Booking> {
    const { propertyId, checkIn, checkOut, guests } = bookingData;

    // Verificar disponibilidad
    const conflicts = await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.propertyId, propertyId),
          ne(bookings.status, "cancelled"),
          or(
            and(
              gte(bookings.checkIn, checkIn),
              lte(bookings.checkIn, checkOut)
            ),
            and(
              gte(bookings.checkOut, checkIn),
              lte(bookings.checkOut, checkOut)
            ),
            and(
              lte(bookings.checkIn, checkIn),
              gte(bookings.checkOut, checkOut)
            )
          )
        )
      );

    if (conflicts.length > 0) {
      throw new Error("La propiedad no está disponible en esas fechas");
    }

    // Obtener precio de la propiedad
    const [property] = await db
      .select()
      .from(properties)
      .where(eq(properties.id, propertyId));

    if (!property) {
      throw new Error("Propiedad no encontrada");
    }

    if (property.hostId === guestId) {
      throw new Error("No puedes reservar tu propia propiedad");
    }

    // Calcular precio total
    const nights = getDaysBetween(checkIn, checkOut);
    const totalPrice = parseFloat(property.pricePerNight) * nights;

    // Crear reserva
    const [booking] = await db
      .insert(bookings)
      .values({
        propertyId,
        guestId,
        checkIn,
        checkOut,
        guests,
        totalPrice: totalPrice.toString(),
        status: "pending",
      })
      .returning();

    return booking;
  }

  async getById(bookingId: string): Promise<BookingWithDetails | undefined> {
    const host = db
      .select({
        hostId: users.id,
        hostName:
          sql<string>`${users.firstName} || ' ' || ${users.lastName}`.as(
            "hostName"
          ),
        hostEmail: sql<string>`${users.email}`.as("hostEmail"),
      })
      .from(users)
      .as("host");

    const guest = db
      .select({
        guestId: users.id,
        guestName:
          sql<string>`${users.firstName} || ' ' || ${users.lastName}`.as(
            "guestName"
          ),
        guestEmail: sql<string>`${users.email}`.as("guestEmail"),
      })
      .from(users)
      .as("guest");

    const result = await db
      .select({
        id: bookings.id,
        propertyId: bookings.propertyId,
        guestId: bookings.guestId,
        checkIn: bookings.checkIn,
        checkOut: bookings.checkOut,
        guests: bookings.guests,
        totalPrice: bookings.totalPrice,
        status: bookings.status,
        createdAt: bookings.createdAt,
        updatedAt: bookings.updatedAt,
        propertyTitle: properties.title,
        propertyAddress: properties.address,
        propertyImages: properties.images,
        hostName: host.hostName,
        hostEmail: host.hostEmail,
        guestName: guest.guestName,
        guestEmail: guest.guestEmail,
      })
      .from(bookings)
      .leftJoin(properties, eq(bookings.propertyId, properties.id))
      .leftJoin(host, eq(properties.hostId, host.hostId))
      .leftJoin(guest, eq(bookings.guestId, guest.guestId))
      .where(eq(bookings.id, bookingId));

    return result[0];
  }

  async getUserBookings(
    userId: string,
    role: "guest" | "host" | "admin"
  ): Promise<Booking[]> {
    if (role === "guest") {
      return await db
        .select()
        .from(bookings)
        .where(eq(bookings.guestId, userId));
    } else {
      // Para hosts, buscar bookings de sus propiedades
      const result = await db
        .select({
          id: bookings.id,
          propertyId: bookings.propertyId,
          guestId: bookings.guestId,
          checkIn: bookings.checkIn,
          checkOut: bookings.checkOut,
          guests: bookings.guests,
          totalPrice: bookings.totalPrice,
          status: bookings.status,
          createdAt: bookings.createdAt,
          updatedAt: bookings.updatedAt,
        })
        .from(bookings)
        .leftJoin(properties, eq(bookings.propertyId, properties.id))
        .where(eq(properties.hostId, userId));

      return result;
    }
  }

  async updateStatus(
    bookingId: string,
    userId: string,
    statusData: UpdateBookingStatusInput
  ): Promise<Booking> {
    const booking = await this.getById(bookingId);

    if (!booking) {
      throw new Error("Reserva no encontrada");
    }

    // Verificar permisos
    const [property] = await db
      .select()
      .from(properties)
      .where(eq(properties.id, booking.propertyId));

    const isHost = property?.hostId === userId;
    const isGuest = booking.guestId === userId;

    if (!isHost && !isGuest) {
      throw new Error("No autorizado");
    }

    // Validar transiciones de estado
    const validTransitions: Record<string, string[]> = {
      pending: ["confirmed", "cancelled"],
      confirmed: ["cancelled", "completed"],
      completed: [],
      cancelled: [],
    };

    if (!validTransitions[booking.status]?.includes(statusData.status)) {
      throw new Error("Transición de estado inválida");
    }

    if (statusData.status === "confirmed" && !isHost) {
      throw new Error("Solo el anfitrión puede confirmar reservas");
    }

    const [updated] = await db
      .update(bookings)
      .set({
        status: statusData.status,
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, bookingId))
      .returning();

    return updated;
  }
}
