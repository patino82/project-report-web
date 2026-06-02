import { NextResponse } from "next/server";

type Bucket = {
  count: number;
  resetAt: number;
};

const WINDOW_MS = 60_000;
const DEFAULT_LIMIT = 30;
const buckets = new Map<string, Bucket>();

function clientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() || "local-dev";
  return request.headers.get("x-real-ip") ?? "local-dev";
}

export function rateLimit(request: Request, limit = DEFAULT_LIMIT): NextResponse | null {
  if (request.method === "GET") return null;

  const now = Date.now();
  const key = clientIp(request);
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return null;
  }

  current.count += 1;
  if (current.count <= limit) return null;

  const retryAfterSeconds = Math.ceil((current.resetAt - now) / 1000);
  return NextResponse.json(
    { error: "Rate limit exceeded. Try again shortly." },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
        "X-RateLimit-Limit": String(limit),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(Math.ceil(current.resetAt / 1000)),
      },
    },
  );
}
