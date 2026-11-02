# Security policy

## Reporting a vulnerability

Please report security issues privately through GitHub Security Advisories on this repository
(`Security` → `Report a vulnerability`). Do not open a public issue that includes an API key,
a request body, or a child-process environment dump.

Include the DeepSeek Harness version, the profile, and reproduction steps. Redact
`TYPESAFE_API_KEY`. Expected first response within 7 days.

## Scope

`dsh-jev-mcp` starts `@jkudish/jev-mcp` on stdio and connects the official
`@deepseek-ai/dsh-mcp-client` so the agent can call that server's judgment tools.

- The plugin resolves the selected provider's credential through `ctx.credentials.resolve`, accepting only the local credential-store source (`file`), not environment or .env fallbacks. It does not read the credentials file itself.
- The key is passed to the child in the selected provider's environment variable, not on the command line or in plugin configuration. The child sends the key and judgment inputs to the selected provider or custom endpoint.
- TypeSafe, OpenRouter, Cloudflare, Vercel, and compatible System One endpoints are supported. Custom addresses can direct this traffic to another host.
- The MCP client's stdio seam scrubs ambient names matching `KEY`, `PASSWORD`,
  `SECRET`, or `TOKEN`, then applies the explicit env from this plugin.
- An empty credential leaves the plugin running and registers no Jev tools. The
  bundled `jev` skill remains available and tells the agent not to ask for the key in chat.
- The plugin does not open a listening socket. The stdio client may start a short-lived
  probe process before the serving process; both are local children of the harness.

## Supported versions

Security fixes target the latest `0.1.x` release on the `>=0.2.1-rc.2 <0.3.0-0` DeepSeek
Harness range.
