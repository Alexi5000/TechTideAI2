import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { env } from "./config/env.js";
import { parseOrigins } from "./utils/origin.js";
import { registerAuth } from "./plugins/auth.js";
import { isHttpError } from "./utils/http-errors.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerAgentRoutes } from "./routes/agents.js";
import { registerLlmRoutes } from "./routes/llm.js";
import { registerRunRoutes } from "./routes/runs.js";
import { registerKnowledgeRoutes } from "./routes/knowledge.js";
import { registerRunEventRoutes } from "./routes/run-events.js";
import { registerInsightsRoutes } from "./routes/insights.js";
import { registerMonitoringRoutes, setMetricsSource, setTracerSource } from "./routes/monitoring.js";
import { tracer, metrics } from "./services/monitoring.js";

export async function buildServer() {
  const app = Fastify({
    logger: env.NODE_ENV !== "test",
  });

  await app.register(cors, {
    origin: parseOrigins(env.CORS_ORIGIN),
    credentials: true,
    allowedHeaders: ["Authorization", "Content-Type", "X-API-Key"],
  });

  await app.register(helmet, {
    contentSecurityPolicy: false,
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
    allowList: ["127.0.0.1", "::1"],
  });

  app.setErrorHandler((error, _request, reply) => {
    if (isHttpError(error)) {
      const errorLabel =
        error.statusCode === 401
          ? "Unauthorized"
          : error.statusCode === 403
            ? "Forbidden"
            : "Error";
      return reply.status(error.statusCode).send({
        error: errorLabel,
        message: error.message,
      });
    }

    app.log.error(error);
    return reply.status(500).send({
      error: "Internal Server Error",
      message: "Unexpected error",
    });
  });

  app.get("/", async () => ({
    name: "TechTideAI API",
    status: "ok",
  }));

  await registerAuth(app);
  await registerHealthRoutes(app);
  await registerAgentRoutes(app);
  await registerLlmRoutes(app);
  await registerRunRoutes(app);
  await registerRunEventRoutes(app);
  await registerKnowledgeRoutes(app);
  await registerInsightsRoutes(app);

  setMetricsSource(metrics);
  setTracerSource(tracer);
  await registerMonitoringRoutes(app);

  return app;
}
