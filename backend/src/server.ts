import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import { env } from "./config/env.js";
import { parseOrigins } from "./utils/origin.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerAgentRoutes } from "./routes/agents.js";
import { registerLlmRoutes } from "./routes/llm.js";
import { registerRunRoutes } from "./routes/runs.js";
import { registerKnowledgeRoutes } from "./routes/knowledge.js";

export async function buildServer() {
  const app = Fastify({
    logger: env.NODE_ENV !== "test",
  });

  await app.register(cors, {
    origin: parseOrigins(env.CORS_ORIGIN),
    credentials: true,
  });

  await app.register(helmet, {
    contentSecurityPolicy: false,
  });

  app.get("/", async () => ({
    name: "TechTideAI API",
    status: "ok",
  }));

  await registerHealthRoutes(app);
  await registerAgentRoutes(app);
  await registerLlmRoutes(app);
  await registerRunRoutes(app);
  await registerKnowledgeRoutes(app);

  return app;
}
