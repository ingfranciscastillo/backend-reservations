import { app } from "./app.js";
import { config } from "./config/env.js";

const PORT = config.port || 3333;

const start = async () => {
  try {
    await app.listen({ port: PORT });
  } catch (error) {
    console.error("Error starting server:", error);
    process.exit(1);
  }
};

start();
