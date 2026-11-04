# Changelog

## 0.2.1

- Support DeepSeek Harness 0.2.x pre-releases: widen the `@deepseek-ai/cordis` peer range to `>=4.0.4 <5.0.0` and `@deepseek-ai/schemastery` to `>=3.18.4 <4.0.0`, and accept the `0.2.1` and `0.2.2-0`-and-later DSH peer ranges side by side. No runtime code changes: the MCP bridge, credentials, skills, and cordis lifecycle APIs this plugin uses are unchanged in 0.2.2. Loading and the full test suite were re-verified against DSH 0.2.2-rc.1.

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
