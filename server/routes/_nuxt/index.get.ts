import { setResponseHeader, setResponseStatus } from "h3";

export default defineEventHandler((event) => {
  setResponseHeader(event, "cache-control", "no-store");
  setResponseStatus(event, 204);
});

