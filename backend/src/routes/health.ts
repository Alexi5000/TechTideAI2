import type { FastifyInstance } from "fastify";
import { env } from "../config/env";

export async function registerHealthRoutes(app: FastifyInstance) {
  app.get("/health", async () => ({
    status: "ok",
    env: env.NODE_ENV,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  }));
}
