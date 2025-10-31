import { z } from "zod";

export const bookingResponseSchema = z.object({
  booking: z.object({
    id: z.uuid(),
    propertyId: z.uuid(),
    guestId: z.uuid(),
    checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    guests: z.number().int().positive().min(1),
    totalPrice: z.string(),
    status: z.enum(["pending", "confirmed", "cancelled", "completed", "paid"]),
    createdAt: z.date(),
    updatedAt: z.date(),
  }),
});

export const createBookingSchema = z
  .object({
    propertyId: z.uuid(),
    checkIn: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido"),
    checkOut: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido"),
    guests: z.number().int().positive().min(1),
  })
  .refine((data) => new Date(data.checkIn) < new Date(data.checkOut), {
    message: "La fecha de salida debe ser posterior a la fecha de entrada",
  })
  .refine((data) => new Date(data.checkIn) >= new Date(), {
    message: "La fecha de entrada debe ser futura",
  });

export const updateBookingStatusSchema = z.object({
  status: z.enum(["pending", "confirmed", "cancelled", "completed", "paid"]),
});

export type Booking = z.infer<typeof bookingResponseSchema>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingStatusInput = z.infer<
  typeof updateBookingStatusSchema
>;
