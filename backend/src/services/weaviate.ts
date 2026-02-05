import { env } from "../config/env.js";
import { VectorStoreUnavailableError } from "../domain/index.js";

const DEFAULT_TIMEOUT_MS = 10000;

function normalizeBaseUrl(url: string) {
  return url.replace(/\/+$/, "");
}

export function requireWeaviateConfig() {
  if (!env.WEAVIATE_URL) {
    throw new VectorStoreUnavailableError(
      "Weaviate not configured. Set WEAVIATE_URL to connect to the vector store.",
    );
  }

  return {
    baseUrl: normalizeBaseUrl(env.WEAVIATE_URL),
    apiKey: env.WEAVIATE_API_KEY,
  };
}

export async function weaviateFetch(
  path: string,
  options: RequestInit & { timeoutMs?: number } = {},
) {
  const { baseUrl, apiKey } = requireWeaviateConfig();
  const url = `${baseUrl}${path.startsWith("/") ? "" : "/"}${path}`;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers = new Headers(options.headers);
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    if (apiKey && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${apiKey}`);
    }

    return await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new VectorStoreUnavailableError(`Weaviate request failed: ${message}`);
  } finally {
    clearTimeout(timeoutId);
  }
}
