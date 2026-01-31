import { createError } from "h3";

export function badRequest(message: string) {
  return createError({ statusCode: 400, statusMessage: message });
}

export function unauthorized(message = "Unauthorized") {
  return createError({ statusCode: 401, statusMessage: message });
}

export function forbidden(message = "Forbidden") {
  return createError({ statusCode: 403, statusMessage: message });
}
