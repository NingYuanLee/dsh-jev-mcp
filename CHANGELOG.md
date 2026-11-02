# Changelog

## 0.2.0

- Add a Jev settings page and support TypeSafe, OpenRouter, Cloudflare Workers AI, Vercel AI Gateway, and compatible System One endpoints. Store keys in DSH credentials and ignore ambient credential fallbacks.

- Update `@jkudish/jev-mcp` to 0.14.7.
- Include the upstream MIT license and acknowledge its authors.

## 0.1.0

First release.

- Starts `@jkudish/jev-mcp@0.14.6` on stdio and registers the judgment tools that server publishes (`mcp__jev__*`).
- Reads the API key from the `TYPESAFE_API_KEY` credential (name configurable). The key is not written into plugin config and is not passed on the command line.
- Forces `JEV_PROVIDER=typesafe`. Optional `model` and origin-only `baseURL`.
- Reconnects when that credential changes.
- Registers a bundled `jev` skill that names the DeepSeek Harness tool prefix.
- Tool calls time out after 2 minutes.
