import {
  createStartHandler,
  defaultStreamHandler,
} from "@tanstack/react-start/server";

const handler = createStartHandler(defaultStreamHandler);

export default (event: any) => {
  const response = handler(event);
  
  // Add security headers if it's a Response object
  if (response instanceof Response) {
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set("X-Permitted-Cross-Domain-Policies", "none");
  }
  
  return response;
};

