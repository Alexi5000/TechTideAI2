const API_BASE = process.env["BACKEND_API_BASE_URL"] ?? "http://localhost:4050";
const API_KEY = process.env["BACKEND_API_KEY"];

export function getApiBase() {
  return API_BASE;
}

export function buildAuthHeaders(base?: HeadersInit) {
  const headers = new Headers(base);
  if (API_KEY) {
    headers.set("Authorization", `Bearer ${API_KEY}`);
  }
  return headers;
}
