import { NextResponse } from "next/server";

function allowedOrigins(): Set<string> {
  const origins = [
    ...(process.env.ALLOWED_ORIGINS ?? "").split(","),
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXTAUTH_URL,
  ]
    .map((origin) => origin?.trim())
    .filter((origin): origin is string => Boolean(origin));

  return new Set(origins);
}

export function corsResponse(request: Request, response: NextResponse) {
  const origin = request.headers.get("origin");
  if (!origin || !allowedOrigins().has(origin)) {
    return response;
  }

  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set("Access-Control-Max-Age", "86400"); // 24 hours
  return response;
}

export function corsOptions(request: Request) {
  // Preflight requests should return 204 No Content
  const response = new NextResponse(null, { status: 204 });
  return corsResponse(request, response);
}
