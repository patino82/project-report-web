import { NextResponse } from "next/server";

export function corsResponse(response: NextResponse) {
  // Allow the specific origin if possible, or * for dev
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set("Access-Control-Max-Age", "86400"); // 24 hours
  return response;
}

export function corsOptions() {
  // Preflight requests should return 204 No Content
  const response = new NextResponse(null, { status: 204 });
  return corsResponse(response);
}
