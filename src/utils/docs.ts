import { swaggerUI } from "@hono/swagger-ui";
import type { OpenAPIHono } from "@hono/zod-openapi";
import { Scalar } from "@scalar/hono-api-reference";
import { DOMAINS_SET } from "@/config/domains";

export function setupDocumentation(app: OpenAPIHono<{ Bindings: CloudflareBindings }>) {
	// OpenAPI Documentation
	app.doc("/openapi.json", {
		openapi: "3.0.0",
		info: {
			version: "1.0.0",
			title: "Temp Mail API",
			description: `
# Temporary Email Service API

A simple and fast temporary email service that allows you to receive emails without registration.

## Features
- Receive emails on temporary addresses
- Multiple supported domains
- Real-time email retrieval
- No registration required
- Automatic cleanup

## Response Format
- **Success responses** include \`success: true\` and a \`result\` field
- **Error responses** include \`success: false\` and an \`error\` object
- **Validation errors** include \`success: false\` and detailed error information

## Supported Domains
This API currently supports the following email domains:
${`\n${Array.from(DOMAINS_SET)
	.map((domain) => `- ${domain}`)
	.join("\n")}`}

**Repository**: [github.com/vwh/temp-mail](https://github.com/vwh/temp-mail)  
**Issues**: [Report bugs or request features](https://github.com/vwh/temp-mail/issues)
`,
			contact: {
				name: "API Support",
				url: "https://github.com/vwh/temp-mail",
			},
			license: {
				name: "MIT",
				url: "https://github.com/vwh/temp-mail/blob/main/LICENSE",
			},
		},
		servers: [
			{
				url: "https://mail.dst.my.id",
				description: "Primary - dst.my.id (custom)",
			},
			{
				url: "https://temp-mail.densat98.workers.dev",
				description: "Fallback workers.dev",
			},
			{
				url: "https://api.barid.site",
				description: "Upstream (vwh)",
			},
		],
		tags: [
			{
				name: "Emails",
				description: "Operations for managing emails by email address",
			},
			{
				name: "Inbox",
				description: "Operations for individual email messages",
			},
			{
				name: "Domains",
				description: "Get information about supported email domains",
			},
		],
		"x-repository": "https://github.com/vwh/temp-mail",
		"x-issues": "https://github.com/vwh/temp-mail/issues",
	});

	// Swagger UI - Traditional documentation
	app.get("/swagger", swaggerUI({ url: "/openapi.json" }));

	// Public API docs at /api (dedicated, not conflicting with assets at /)
	app.get(
		"/api",
		Scalar({
			url: "/openapi.json",
			theme: "purple",
			pageTitle: "dst.my.id Temp Mail API",
		}),
	);

	// Keep /docs as alias - preserve hash: if hash looks like email (@) go to web client at /, else to /api
	app.get("/docs", (c) =>
		c.html(
			`<!doctype html><meta charset="utf-8"><title>Redirect</title><script>
const h=location.hash||"";
if(h.includes("@")||h.includes("%40")) location.replace("/"+h);
else location.replace("/api"+h);
<\/script><p>Redirecting… <a href="/api">/api</a> | <a href="/">/</a></p>`,
			200,
			{ "Content-Type": "text/html; charset=utf-8" },
		),
	);

	// Scalar at root fallback (only used when assets not found - kept for workers.dev without assets)
	app.get(
		"/scalar",
		Scalar({
			url: "/openapi.json",
			theme: "purple",
		}),
	);
}
