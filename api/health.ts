import type { IncomingMessage, ServerResponse } from "node:http";

/** Confirms that Vercel can start a basic Node function independently of YouTube. */
export default function health(
  request: IncomingMessage,
  response: ServerResponse,
): void {
  if (request.method !== "GET") {
    response.statusCode = 405;
    response.setHeader("Allow", "GET");
    response.end();
    return;
  }

  response.statusCode = 200;
  response.setHeader("Content-Type", "text/plain; charset=utf-8");
  response.end("ok");
}
