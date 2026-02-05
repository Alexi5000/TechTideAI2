export function parseOrigins(value: string) {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}
