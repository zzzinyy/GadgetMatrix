import {
  createStartHandler,
  defaultStreamHandler,
} from "@tanstack/react-start/server";

const handler = createStartHandler(defaultStreamHandler);

export default async (event: Parameters<typeof handler>[0]) => {
  const response = await handler(event);

  // Add security headers if it's a Response object (clone: original headers can be immutable)
  if (response instanceof Response) {
    const headers = new Headers(response.headers);
    headers.set("X-Frame-Options", "DENY");
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
    headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    headers.set("X-Permitted-Cross-Domain-Policies", "none");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  return response;
};

