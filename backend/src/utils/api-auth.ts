import { timingSafeEqual } from "node:crypto";
import type { FastifyInstance } from "fastify";

interface AccessConfig {
  NODE_ENV: string;
  BACKEND_API_TOKEN?: string | undefined;
  CORS_ORIGIN: string;
}

const loopback = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);
const localHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function registerApiAuth(app: FastifyInstance, config: AccessConfig) {
  app.addHook("onRequest", async (request, reply) => {
    if (request.url === "/health" || request.url === "/") return;
    const origin = request.headers.origin;
    if (
      origin &&
      !config.CORS_ORIGIN.split(",")
        .map((value) => value.trim())
        .includes(origin)
    ) {
      return reply.code(403).send({ error: "Origin not allowed" });
    }
    const token = config.BACKEND_API_TOKEN;
    if (
      !token &&
      config.NODE_ENV !== "production" &&
      loopback.has(request.socket.remoteAddress ?? "")
    ) {
      try {
        const host = new URL(`http://${request.headers.host ?? ""}`).hostname;
        if (localHosts.has(host)) return;
      } catch {
        /* Invalid hosts never grant local access. */
      }
    }
    if (!token || token.length < 32) {
      return reply.code(503).send({ error: "Operator access is not configured" });
    }
    const supplied = request.headers.authorization?.replace(/^Bearer /i, "") ?? "";
    const expected = Buffer.from(token);
    const candidate = Buffer.from(supplied);
    if (
      !/^Bearer /i.test(request.headers.authorization ?? "") ||
      candidate.length !== expected.length ||
      !timingSafeEqual(candidate, expected)
    ) {
      return reply.code(401).send({ error: "Operator authorization required" });
    }
  });
}
