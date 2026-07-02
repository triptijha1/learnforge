import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
  console.warn("REDIS_URL is not set. Rate limiting will not work without Redis.");
}

const redis = redisUrl ? new Redis(redisUrl) : null;
const WINDOW_SECONDS = 60;
const MAX_REQUESTS = 40;

export async function rateLimit(req: Request) {
  if (!redis) {
    return { success: true };
  }

  const forwarded = req.headers.get("x-forwarded-for") || "";
  const ip = forwarded.split(",")[0]?.trim() || "anonymous";
  const key = `rate-limit:${ip}`;

  const current = await redis.incr(key);
  if (current === 1) {
    await redis.expire(key, WINDOW_SECONDS);
  }

  if (current > MAX_REQUESTS) {
    return {
      success: false,
      retryAfter: WINDOW_SECONDS,
    };
  }

  return {
    success: true,
    remaining: MAX_REQUESTS - current,
  };
}

export function rateLimitHeaders(result: { success: boolean; retryAfter?: number; remaining?: number }) {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(MAX_REQUESTS),
    "X-RateLimit-Remaining": String(result.remaining ?? 0),
  };

  if (!result.success && result.retryAfter) {
    headers["Retry-After"] = String(result.retryAfter);
  }

  return headers;
}
