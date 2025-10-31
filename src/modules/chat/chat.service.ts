import type WebSocket from "ws";
import { db } from "../../config/db/index.js";
import {
  messages,
  bookings,
  properties,
  users,
  type Message,
} from "../../config/db/schema.js";
import { eq, and, or, asc, sql } from "drizzle-orm";
import type { SendMessageInput } from "./chat.schemas.js";

export interface MessageWithDetails extends Message {
  senderName: string;
  senderAvatar: string | null;
}

export class ChatService {
  private connections = new Map<string, WebSocket>();

  async sendMessage(
    messageData: SendMessageInput,
    senderId: string
  ): Promise<Message> {
    const { receiverId, bookingId, content } = messageData;

    // Verificar autorización si hay bookingId
    if (bookingId) {
      const [booking] = await db
        .select({
          guestId: bookings.guestId,
          hostId: properties.hostId,
        })
        .from(bookings)
        .leftJoin(properties, eq(bookings.propertyId, properties.id))
        .where(eq(bookings.id, bookingId));

      if (!booking) {
        throw new Error("Reserva no encontrada");
      }

      const isAuthorized =
        (senderId === booking.guestId && receiverId === booking.hostId) ||
        (senderId === booking.hostId && receiverId === booking.guestId);

      if (!isAuthorized) {
        throw new Error(
          "No autorizado para enviar mensajes en esta conversación"
        );
      }
    }

    // Guardar mensaje
    const [message] = await db
      .insert(messages)
      .values({
        senderId,
        receiverId,
        bookingId: bookingId || null,
        content,
      })
      .returning();

    // Enviar a través de WebSocket si el receptor está conectado
    const receiverConnection = this.connections.get(receiverId);
    if (receiverConnection) {
      receiverConnection.send(
        JSON.stringify({
          type: "new_message",
          message,
        })
      );
    }

    return message;
  }

  async getConversation(
    userId: string,
    otherUserId: string,
    bookingId?: string
  ): Promise<MessageWithDetails[]> {
    let query = db
      .select({
        id: messages.id,
        senderId: messages.senderId,
        receiverId: messages.receiverId,
        bookingId: messages.bookingId,
        content: messages.content,
        read: messages.read,
        createdAt: messages.createdAt,
        senderName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        senderAvatar: users.avatarUrl,
      })
      .from(messages)
      .leftJoin(users, eq(messages.senderId, users.id))
      .where(
        or(
          and(
            eq(messages.senderId, userId),
            eq(messages.receiverId, otherUserId)
          ),
          and(
            eq(messages.senderId, otherUserId),
            eq(messages.receiverId, userId)
          )
        )
      );

    const result = await query.orderBy(asc(messages.createdAt));

    // Marcar mensajes como leídos
    await db
      .update(messages)
      .set({ read: true })
      .where(
        and(
          eq(messages.senderId, otherUserId),
          eq(messages.receiverId, userId),
          eq(messages.read, false)
        )
      );

    return result;
  }

  registerConnection(userId: string, ws: WebSocket): void {
    this.connections.set(userId, ws);
  }

  unregisterConnection(userId: string): void {
    this.connections.delete(userId);
  }
}
