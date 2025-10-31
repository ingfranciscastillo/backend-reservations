import { z } from "zod";

export const sendMessageSchema = z.object({
  receiverId: z.uuid(),
  bookingId: z.uuid().optional(),
  content: z.string().min(1).max(1000),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
