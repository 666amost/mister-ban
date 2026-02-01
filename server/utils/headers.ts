import type { H3Event } from "h3"
import { setResponseHeaders } from "h3"

export function setCacheHeaders(event: H3Event, maxAge: number = 0) {
  if (maxAge > 0) {
    setResponseHeaders(event, {
      'Cache-Control': `public, max-age=${maxAge}, s-maxage=${maxAge * 2}`,
      'CDN-Cache-Control': `public, max-age=${maxAge * 2}`,
      'Vercel-CDN-Cache-Control': `public, max-age=${maxAge * 2}`,
    })
  } else {
    setResponseHeaders(event, {
      'Cache-Control': 'private, no-cache, no-store, must-revalidate',
    })
  }
}

export function setJSONHeaders(event: H3Event) {
  setResponseHeaders(event, {
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
  })
}

export function optimizeResponse(event: H3Event, cacheDuration: number = 0) {
  setJSONHeaders(event)
  setCacheHeaders(event, cacheDuration)
}
