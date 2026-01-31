import type { H3Event } from "h3";
import { createError, getQuery, readBody } from "h3";
import type { ZodType, ZodTypeDef } from "zod";

export async function readBodyWithSchema<T>(
  event: H3Event,
  schema: ZodType<T, ZodTypeDef, unknown>,
) {
  const body = await readBody(event);
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    throw createError({ statusCode: 400, statusMessage: "Invalid body" });
  return parsed.data;
}

export function getQueryWithSchema<T>(
  event: H3Event,
  schema: ZodType<T, ZodTypeDef, unknown>,
) {
  const query = getQuery(event);
  const parsed = schema.safeParse(query);
  if (!parsed.success)
    throw createError({ statusCode: 400, statusMessage: "Invalid query" });
  return parsed.data;
}
