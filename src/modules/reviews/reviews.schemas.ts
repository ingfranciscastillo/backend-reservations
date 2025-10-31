import { z } from "zod";

export const createReviewSchema = z.object({
  bookingId: z.uuid(),
  revieweeId: z.uuid(),
  propertyId: z.uuid().optional(),
  rating: z
    .number()
    .int()
    .min(1, "Rating mínimo es 1")
    .max(5, "Rating máximo es 5"),
  comment: z
    .string()
    .min(10, "El comentario debe tener al menos 10 caracteres")
    .optional(),
  reviewType: z.enum(["guest_to_host", "host_to_guest"]),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
