import { build } from "./app.js";
import { config } from "./config/env.js";
import { db } from "./config/db/index.js";
import { sql } from "drizzle-orm";

const start = async () => {
  const fastify = await build();

  try {
    await db.execute(sql`SELECT NOW()`);
    fastify.log.info("Database connection successful");

    await fastify.listen({ port: config.port, host: "0.0.0.0" });

    fastify.log.info(`🚀 Server listening on port ${config.port}`);
    fastify.log.info(`📝 Environment: ${config.nodeEnv}`);
  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
};

// Handle graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`${signal} signal received: closing HTTP server`);
  process.exit(0);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

start();
