import { z } from "zod";

export const processPaymentSchema = z.object({
  bookingId: z.uuid(),
  paymentMethod: z.string().min(1),
  transactionId: z.string().optional(),
});

export type ProcessPaymentInput = z.infer<typeof processPaymentSchema>;
