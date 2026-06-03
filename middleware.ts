import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isBasicAuthAllowed } from "@/lib/basic-auth";

export function middleware(request: NextRequest) {
  if (isBasicAuthAllowed(request.headers, {
    APP_BASIC_AUTH_USER: process.env.APP_BASIC_AUTH_USER,
    APP_BASIC_AUTH_PASSWORD: process.env.APP_BASIC_AUTH_PASSWORD,
  })) {
    return NextResponse.next();
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Project Report Assistant"',
    },
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/health|api/auth/exchange|api/projects|api/trades|api/companies|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
