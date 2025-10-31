import { db } from "../../config/db/index.js";
import {
  payments,
  bookings,
  properties,
  users,
  type Payment,
} from "../../config/db/schema.js";
import { eq, and, desc, sql, between } from "drizzle-orm";
import { config } from "../../config/env.js";
import type { ProcessPaymentInput } from "./payments.schemas.js";

export interface PaymentWithDetails extends Payment {
  checkIn: string;
  checkOut: string;
  guests: number;
  propertyTitle: string;
  hostName: string;
  guestName: string;
}

export interface UserPayment {
  id: string;
  amount?: string;
  hostAmount?: string;
  paymentStatus: string | null;
  createdAt: Date;
  propertyTitle: string | null;
  checkIn: string;
  checkOut: string;
  guestName?: string;
}

export interface HostEarnings {
  totalEarnings: number;
  totalFees: number;
  totalPayments: number;
  month: string;
}

export class PaymentsService {
  async processPayment(
    paymentData: ProcessPaymentInput,
    payerId: string
  ): Promise<Payment> {
    const { bookingId, paymentMethod, transactionId } = paymentData;

    // Obtener información de la reserva
    const [booking] = await db
      .select({
        id: bookings.id,
        guestId: bookings.guestId,
        totalPrice: bookings.totalPrice,
        status: bookings.status,
        hostId: properties.hostId,
      })
      .from(bookings)
      .leftJoin(properties, eq(bookings.propertyId, properties.id))
      .where(eq(bookings.id, bookingId));

    if (!booking) {
      throw new Error("Reserva no encontrada");
    }

    if (booking.guestId !== payerId) {
      throw new Error("No autorizado para pagar esta reserva");
    }

    if (booking.status !== "confirmed") {
      throw new Error("La reserva debe estar confirmada para procesar el pago");
    }

    // Verificar si ya existe un pago
    const existingPayment = await db
      .select()
      .from(payments)
      .where(eq(payments.bookingId, bookingId));

    if (existingPayment.length > 0) {
      throw new Error("Ya existe un pago para esta reserva");
    }

    // Calcular fees
    const amount = parseFloat(booking.totalPrice);
    const platformFee = amount * (config.PLATFORM_FEE_PERCENTAGE / 100);
    const hostAmount = amount - platformFee;

    // Crear registro de pago
    const [payment] = await db
      .insert(payments)
      .values({
        bookingId,
        payerId,
        amount: amount.toString(),
        platformFee: platformFee.toString(),
        hostAmount: hostAmount.toString(),
        paymentMethod,
        transactionId: transactionId || null,
        paymentStatus: "completed",
      })
      .returning();

    // Actualizar estado de la reserva
    await db
      .update(bookings)
      .set({ status: "paid", updatedAt: new Date() })
      .where(eq(bookings.id, bookingId));

    return payment;
  }

  async getPaymentDetails(
    paymentId: string,
    userId: string
  ): Promise<PaymentWithDetails> {
    const result = await db
      .select({
        id: payments.id,
        bookingId: payments.bookingId,
        payerId: payments.payerId,
        amount: payments.amount,
        platformFee: payments.platformFee,
        hostAmount: payments.hostAmount,
        paymentMethod: payments.paymentMethod,
        paymentStatus: payments.paymentStatus,
        transactionId: payments.transactionId,
        createdAt: payments.createdAt,
        updatedAt: payments.updatedAt,
        checkIn: bookings.checkIn,
        checkOut: bookings.checkOut,
        guests: bookings.guests,
        propertyTitle: properties.title,
        hostName: sql<string>`host.first_name || ' ' || host.last_name`,
        guestName: sql<string>`guest.first_name || ' ' || guest.last_name`,
      })
      .from(payments)
      .leftJoin(bookings, eq(payments.bookingId, bookings.id))
      .leftJoin(properties, eq(bookings.propertyId, properties.id))
      .leftJoin(users.as("host"), eq(properties.hostId, users.id))
      .leftJoin(users.as("guest"), eq(bookings.guestId, users.id))
      .where(eq(payments.id, paymentId));

    if (result.length === 0) {
      throw new Error("Pago no encontrado");
    }

    const payment = result[0];

    // Verificar permisos
    const [property] = await db
      .select({ hostId: properties.hostId })
      .from(properties)
      .leftJoin(bookings, eq(properties.id, bookings.propertyId))
      .where(eq(bookings.id, payment.bookingId));

    if (payment.payerId !== userId && property?.hostId !== userId) {
      throw new Error("No autorizado");
    }

    return payment;
  }

  async getUserPayments(
    userId: string,
    role: "guest" | "host" | "admin"
  ): Promise<UserPayment[]> {
    if (role === "guest") {
      // Pagos realizados por el guest
      const result = await db
        .select({
          id: payments.id,
          amount: payments.amount,
          paymentStatus: payments.paymentStatus,
          paymentMethod: payments.paymentMethod,
          transactionId: payments.transactionId,
          createdAt: payments.createdAt,
          propertyTitle: properties.title,
          checkIn: bookings.checkIn,
          checkOut: bookings.checkOut,
        })
        .from(payments)
        .leftJoin(bookings, eq(payments.bookingId, bookings.id))
        .leftJoin(properties, eq(bookings.propertyId, properties.id))
        .where(eq(payments.payerId, userId))
        .orderBy(desc(payments.createdAt));

      return result as UserPayment[];
    } else {
      // Pagos recibidos por el host
      const result = await db
        .select({
          id: payments.id,
          hostAmount: payments.hostAmount,
          platformFee: payments.platformFee,
          paymentStatus: payments.paymentStatus,
          paymentMethod: payments.paymentMethod,
          createdAt: payments.createdAt,
          propertyTitle: properties.title,
          checkIn: bookings.checkIn,
          checkOut: bookings.checkOut,
          guestName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        })
        .from(payments)
        .leftJoin(bookings, eq(payments.bookingId, bookings.id))
        .leftJoin(properties, eq(bookings.propertyId, properties.id))
        .leftJoin(users, eq(bookings.guestId, users.id))
        .where(eq(properties.hostId, userId))
        .orderBy(desc(payments.createdAt));

      return result as UserPayment[];
    }
  }

  async getHostEarnings(
    hostId: string,
    startDate: string,
    endDate: string
  ): Promise<HostEarnings[]> {
    const result = await db
      .select({
        totalEarnings: sql<number>`COALESCE(SUM(CAST(${payments.hostAmount} AS DECIMAL)), 0)`,
        totalFees: sql<number>`COALESCE(SUM(CAST(${payments.platformFee} AS DECIMAL)), 0)`,
        totalPayments: sql<number>`COUNT(${payments.id})`,
        month: sql<string>`TO_CHAR(${payments.createdAt}, 'YYYY-MM')`,
      })
      .from(payments)
      .leftJoin(bookings, eq(payments.bookingId, bookings.id))
      .leftJoin(properties, eq(bookings.propertyId, properties.id))
      .where(
        and(
          eq(properties.hostId, hostId),
          eq(payments.paymentStatus, "completed"),
          between(payments.createdAt, new Date(startDate), new Date(endDate))
        )
      )
      .groupBy(sql`TO_CHAR(${payments.createdAt}, 'YYYY-MM')`)
      .orderBy(desc(sql`TO_CHAR(${payments.createdAt}, 'YYYY-MM')`));

    return result;
  }

  // Método adicional útil: Obtener resumen de ganancias
  async getEarningsSummary(hostId: string): Promise<{
    totalEarnings: number;
    totalPayments: number;
    averagePerBooking: number;
    thisMonthEarnings: number;
  }> {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totals] = await db
      .select({
        totalEarnings: sql<number>`COALESCE(SUM(CAST(${payments.hostAmount} AS DECIMAL)), 0)`,
        totalPayments: sql<number>`COUNT(${payments.id})`,
        averagePerBooking: sql<number>`COALESCE(AVG(CAST(${payments.hostAmount} AS DECIMAL)), 0)`,
      })
      .from(payments)
      .leftJoin(bookings, eq(payments.bookingId, bookings.id))
      .leftJoin(properties, eq(bookings.propertyId, properties.id))
      .where(
        and(
          eq(properties.hostId, hostId),
          eq(payments.paymentStatus, "completed")
        )
      );

    const [thisMonth] = await db
      .select({
        thisMonthEarnings: sql<number>`COALESCE(SUM(CAST(${payments.hostAmount} AS DECIMAL)), 0)`,
      })
      .from(payments)
      .leftJoin(bookings, eq(payments.bookingId, bookings.id))
      .leftJoin(properties, eq(bookings.propertyId, properties.id))
      .where(
        and(
          eq(properties.hostId, hostId),
          eq(payments.paymentStatus, "completed"),
          sql`${payments.createdAt} >= ${firstDayOfMonth}`
        )
      );

    return {
      totalEarnings: totals.totalEarnings,
      totalPayments: totals.totalPayments,
      averagePerBooking: totals.averagePerBooking,
      thisMonthEarnings: thisMonth.thisMonthEarnings,
    };
  }

  // Método para obtener historial de pagos de una propiedad específica
  async getPropertyPayments(
    propertyId: string,
    hostId: string
  ): Promise<UserPayment[]> {
    // Verificar que la propiedad pertenece al host
    const [property] = await db
      .select()
      .from(properties)
      .where(eq(properties.id, propertyId));

    if (!property || property.hostId !== hostId) {
      throw new Error("No autorizado o propiedad no encontrada");
    }

    const result = await db
      .select({
        id: payments.id,
        hostAmount: payments.hostAmount,
        platformFee: payments.platformFee,
        paymentStatus: payments.paymentStatus,
        paymentMethod: payments.paymentMethod,
        createdAt: payments.createdAt,
        propertyTitle: properties.title,
        checkIn: bookings.checkIn,
        checkOut: bookings.checkOut,
        guestName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
      })
      .from(payments)
      .leftJoin(bookings, eq(payments.bookingId, bookings.id))
      .leftJoin(properties, eq(bookings.propertyId, properties.id))
      .leftJoin(users, eq(bookings.guestId, users.id))
      .where(eq(bookings.propertyId, propertyId))
      .orderBy(desc(payments.createdAt));

    return result as UserPayment[];
  }

  // Método para refund (reembolso)
  async refundPayment(
    paymentId: string,
    userId: string,
    reason?: string
  ): Promise<Payment> {
    const payment = await this.getPaymentDetails(paymentId, userId);

    if (payment.paymentStatus !== "completed") {
      throw new Error("Solo se pueden reembolsar pagos completados");
    }

    // Verificar que el usuario es el host
    const [property] = await db
      .select({ hostId: properties.hostId })
      .from(properties)
      .leftJoin(bookings, eq(properties.id, bookings.propertyId))
      .where(eq(bookings.id, payment.bookingId));

    if (property?.hostId !== userId) {
      throw new Error("Solo el anfitrión puede procesar reembolsos");
    }

    // Actualizar el pago
    const [refundedPayment] = await db
      .update(payments)
      .set({
        paymentStatus: "refunded",
        updatedAt: new Date(),
      })
      .where(eq(payments.id, paymentId))
      .returning();

    // Actualizar la reserva
    await db
      .update(bookings)
      .set({
        status: "cancelled",
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, payment.bookingId));

    return refundedPayment;
  }
}
