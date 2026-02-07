import type { FastifyInstance } from "fastify";
import { env } from "../config/env.js";
import { HttpError } from "../utils/http-errors.js";

const EXEMPT_PATHS = new Set(["/", "/health"]);

function extractApiKey(
  authorization: string | string[] | undefined,
  apiKeyHeader: string | string[] | undefined,
): string | null {
  if (authorization) {
    const value = Array.isArray(authorization) ? authorization[0] : authorization;
    if (value) {
      const [scheme, token] = value.split(" ");
      if (scheme?.toLowerCase() === "bearer" && token) {
        return token.trim();
      }
    }
  }

  if (apiKeyHeader) {
    const value = Array.isArray(apiKeyHeader) ? apiKeyHeader[0] : apiKeyHeader;
    if (value) {
      return value.trim();
    }
  }

  return null;
}

export async function registerAuth(app: FastifyInstance) {
  app.addHook("preHandler", async (request) => {
    const url = request.raw.url ?? request.url;
    const path = url.split("?")[0] ?? "";

    if (EXEMPT_PATHS.has(path) || !path.startsWith("/api/")) {
      return;
    }

    // If no API_KEY is configured, skip auth (open access for local dev)
    if (!env.API_KEY) {
      return;
    }

    const token = extractApiKey(
      request.headers.authorization,
      request.headers["x-api-key"],
    );

    if (!token || token !== env.API_KEY) {
      throw new HttpError(401, "Unauthorized");
    }
  });
}
