import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { ChatService } from "./chat.service.js";
import { ChatController } from "./chat.controller.js";
import { sendMessageSchema } from "./chat.schemas.js";

const chatService = new ChatService();

export default async function chatRoutes(fastify: FastifyInstance) {
  const server = fastify.withTypeProvider<ZodTypeProvider>();
  const chatController = new ChatController(chatService);

  // Todas las rutas requieren autenticación
  server.addHook("onRequest", server.authenticate);

  server.post(
    "/messages",
    {
      schema: {
        body: sendMessageSchema,
      },
    },
    chatController.sendMessage.bind(chatController)
  );

  server.get(
    "/conversation",
    chatController.getConversation.bind(chatController)
  );

  server.get(
    "/conversations",
    chatController.getConversations.bind(chatController)
  );

  // WebSocket para chat en tiempo real
  server.get(
    "/ws",
    {
      websocket: true,
    },
    (connection, req) => {
      const token = req.query.token as string;

      if (!token) {
        connection.socket.close();
        return;
      }

      try {
        const decoded = server.jwt.verify(token) as {
          id: string;
          email: string;
          role: "guest" | "host" | "admin";
        };
        const userId = decoded.id;

        chatService.registerConnection(userId, connection.socket);

        connection.socket.on("message", async (message) => {
          try {
            const data = JSON.parse(message.toString()) as {
              type: string;
              payload: SendMessageInput;
            };

            if (data.type === "send_message") {
              await chatService.sendMessage(data.payload, userId);
            }
          } catch (error) {
            console.error("WebSocket message error:", error);
          }
        });

        connection.socket.on("close", () => {
          chatService.unregisterConnection(userId);
        });
      } catch (error) {
        connection.socket.close();
      }
    }
  );
}
