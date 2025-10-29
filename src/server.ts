import { app } from "./app.js";

const PORT = 3333;

const start = async () => {
  try {
    await app.listen({ port: PORT });
  } catch (error) {
    console.error("Error starting server:", error);
    process.exit(1);
  }
};

start();
