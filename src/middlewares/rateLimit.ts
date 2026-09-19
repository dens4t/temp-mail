import type { MiddlewareHandler } from "hono";

type Entry = { count: number; resetAt: number };

// in-memory per-isolate store — Free tier compatible (no KV/D1 needed)
// Workers isolates are reused, 60 req/min per IP is enforced best-effort
const store = new Map<string, Entry>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 60;

// periodic cleanup to avoid memory leak (every 5 min)
let lastCleanup = Date.now();
function cleanup(now: number) {
	if (now - lastCleanup < 300_000) return;
	lastCleanup = now;
	for (const [k, v] of store) if (v.resetAt <= now) store.delete(k);
}

const rateLimitMiddleware: MiddlewareHandler = async (c, next) => {
	// skip for health/docs and assets - but keep rate limit for api
	const path = new URL(c.req.url).pathname;
	if (path === "/" || path.startsWith("/docs") || path.startsWith("/scalar") || path === "/health") {
		await next();
		return;
	}

	const ip =
		c.req.header("CF-Connecting-IP") ||
		c.req.header("X-Forwarded-For")?.split(",")[0]?.trim() ||
		"unknown";

	const now = Date.now();
	cleanup(now);

	let entry = store.get(ip);
	if (!entry || entry.resetAt <= now) {
		entry = { count: 1, resetAt: now + WINDOW_MS };
		store.set(ip, entry);
	} else {
		entry.count++;
	}

	const remaining = Math.max(0, MAX_REQUESTS - entry.count);
	const resetSec = Math.ceil((entry.resetAt - now) / 1000);

	c.header("X-RateLimit-Limit", String(MAX_REQUESTS));
	c.header("X-RateLimit-Remaining", String(remaining));
	c.header("X-RateLimit-Reset", String(resetSec));

	if (entry.count > MAX_REQUESTS) {
		return c.json(
			{
				success: false,
				error: {
					name: "RateLimit",
					message: `Rate limit exceeded: max ${MAX_REQUESTS} requests per minute. Try again in ${resetSec}s.`,
				},
			},
			429,
		);
	}

	await next();
};

export default rateLimitMiddleware;
