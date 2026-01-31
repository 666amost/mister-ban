import { badRequest } from "./http";

export function parseLimit(
  raw: unknown,
  { min = 1, max = 200, fallback = 50 } = {},
) {
  if (raw == null || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n))
    throw badRequest("Invalid limit");
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

export function parseOffset(raw: unknown) {
  if (raw == null || raw === "") return 0;
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0)
    throw badRequest("Invalid offset");
  return n;
}
