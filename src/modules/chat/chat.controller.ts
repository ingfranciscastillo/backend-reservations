import type { FastifyRequest, FastifyReply } from "fastify";
import { ChatService } from "./chat.service.js";
import type { SendMessageInput } from "./chat.schemas.js";

export class ChatController {
  constructor(private chatService: ChatService) {}

  async sendMessage(
    request: FastifyRequest<{ Body: SendMessageInput }>,
    reply: FastifyReply
  ) {
    try {
      const message = await this.chatService.sendMessage(
        request.body,
        request.user.id
      );
      return { message };
    } catch (error) {
      return reply.status(400).send({
        error: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  }

  async getConversation(
    request: FastifyRequest<{
      Querystring: { otherUserId: string; bookingId?: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { otherUserId, bookingId } = request.query;
      const messages = await this.chatService.getConversation(
        request.user.id,
        otherUserId,
        bookingId
      );
      return { messages, count: messages.length };
    } catch (error) {
      return reply.status(500).send({
        error: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  }

  async getConversations(request: FastifyRequest, reply: FastifyReply) {
    try {
      const conversations = await this.chatService.getConversations(
        request.user.id
      );
      return { conversations, count: conversations.length };
    } catch (error) {
      return reply.status(500).send({
        error: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  }
}
