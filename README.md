# dsh-jev-mcp

[![CI](https://github.com/NingYuanLee/dsh-jev-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/NingYuanLee/dsh-jev-mcp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![dsh](https://img.shields.io/badge/dsh-%3E%3D0.2.1--rc.2%20%3C0.3.0--0-6f42c1)](package.json)

> Third-party community plugin for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness). Not an official DeepSeek or TypeSafe product. MIT licensed.

English | [中文](README.zh.md)

Runs [@jkudish/jev-mcp](https://github.com/jkudish/jev-mcp) inside DeepSeek Harness and registers the judgment tools that server publishes. They show up as `mcp__jev__*`. Jev answers typed questions (verify, screen, find, rerank, classify, decide, compare, extract, audit, review, gate, noul). It does not chat and it is not a replacement for the model running the agent. See [Jev with coding agents](https://docs.typesafe.ai/introduction/coding-agents).

## What it does

The agent can call Jev without a separate MCP config. The plugin reads an API key from the DSH credential store, starts the pinned `@jkudish/jev-mcp` package on stdio with `node`, and hands that process to `@deepseek-ai/dsh-mcp-client`. The key is not stored in `cordis.patch.yml` and is not placed on the command line.

It also registers a `jev` skill so the agent loads the call conventions before using the tools. In this host the raw names are prefixed: `jev_verify` is `mcp__jev__jev_verify`.

If the credential is empty, the plugin stays loaded, the skill stays available, and no Jev tools are registered. Saving the credential reconnects.

## How it works

1. Register the bundled `jev` skill on `ctx.skills`. A user or project skill with the same name still wins.
2. Resolve the selected provider’s credential through `ctx.credentials` (TypeSafe defaults to `TYPESAFE_API_KEY`). Only the credential-store value is accepted; process and .env fallbacks are ignored.
3. Resolve `@jkudish/jev-mcp`'s `bin` (`dist/index.js` in 0.14.7) and spawn it with `process.execPath`. The child receives the selected provider’s credential, `JEV_PROVIDER`, and `JEV_MCP_MODEL`.
4. Mount one `@deepseek-ai/dsh-mcp-client` child with `transport: stdio`. Tool names, schemas, and results come from the server. This package does not reimplement them.
5. When `credentials/reference-updated` fires for the same credential name, dispose that child and connect again.

Each tool call times out after 2 minutes. A dropped connection uses the MCP client's own reconnect policy. The stdio client probes once before the serving process; that second process is the harness, not this package.

## Install

```bash
dsh plugin --profile web add dsh-jev-mcp
```

GitHub checkout instead:

```bash
dsh plugin --profile web add github:NingYuanLee/dsh-jev-mcp
```

From this directory, before the package is published:

```bash
dsh plugin --profile web add ./dsh-jev-mcp
```

The package declares `dsh.bundle.patch`, so `dsh plugin add` writes the bundle into the profile. Restart DeepSeek Harness if the tools do not appear in the current session.

Create a key at the [TypeSafe console](https://console.typesafe.ai/settings/keys), then enter the key and model ID under Settings → Jev model. The key is saved in the DSH credential store; leaving the key field blank keeps the saved key.

## Configuration

| Field | Default | Meaning |
|---|---|---|
| `apiKeyEnv` | `TYPESAFE_API_KEY` | Credential reference. The value is not kept in this config. |
| `serverName` | `jev` | Namespace for tool names: `mcp__<serverName>__<tool>`. Must match `[A-Za-z0-9_-]{1,32}` and be unique among MCP clients in the same scope. |
| `model` | `jev-latest` | Passed as `JEV_MCP_MODEL`. Use a name from `GET /v1/models`, such as `jev-1.14`. |
| `baseURL` | empty | Optional TypeSafe origin only (`https://api.typesafe.ai`). The SDK appends the route. No user info, path, query, or fragment. |

Example profile override. A later patch replaces the whole `config` object, so repeat every field you still want:

```yaml
- id: jev-mcp
  config:
    apiKeyEnv: TYPESAFE_API_KEY
    serverName: jev
    model: jev-latest
    baseURL: ""
```

The Cordis row id is `jev-mcp`. The package name is `dsh-jev-mcp`.

TypeSafe, OpenRouter, Cloudflare Workers AI, Vercel AI Gateway, and compatible System One endpoints are supported. Keys are stored separately; Cloudflare requires an account ID, compatible services require a full endpoint URL, and Vercel supports optional zero-data-retention routing. Ambient keys matching `KEY`, `TOKEN`, `SECRET`, or `PASSWORD` are scrubbed by the MCP client before the explicit env is applied.

## Security

- The key is passed only through the selected provider’s child environment variable.
- The child sends the key and judgment text to the selected provider or configured endpoint.
- This plugin's own log lines do not print the key. Do not paste the key into chat.
- The plugin does not read `$DSH_HOME/.credentials.yaml` itself.

See [SECURITY.md](SECURITY.md).

## Compatibility

| Item | Value |
|---|---|
| dsh | `>=0.2.1-rc.2 <0.3.0-0` |
| Node | `>=22.19.0` |
| Jev MCP | `@jkudish/jev-mcp@0.14.7` |
| Requires | `credentials`, `tools`, `skills`, and the shipped `@deepseek-ai/dsh-mcp-client` |

Display metadata is `locale/en.json`, `locale/zh.json`, and `icon.svg`. The plugin settings panel provides model and API key configuration.

## Uninstall

```bash
dsh plugin --profile <name> remove dsh-jev-mcp
```

Removing the plugin stops the MCP process and unregisters its tools and the bundled skill. It does not delete saved provider credentials. Nothing else is stored on disk by this package.

## Troubleshooting

**No `mcp__jev__*` tools.** The credential named by `apiKeyEnv` is empty, the server rejected the key, `@jkudish/jev-mcp` did not install, or another MCP client already reserved `serverName` `jev`. Set the credential and restart the plugin. The plugin log says the credential is missing without printing its value.

**`serverName` is already in use.** Pick another `serverName` in config. That also changes the public tool names. The skill text still says `mcp__jev__*`; follow the configured name.

**A call times out.** The limit is 2 minutes per call and is not a config field in 0.1.0. The server's own request deadline is 60 seconds.

**The agent tries to `npx @jkudish/jev-mcp`.** Load the `jev` skill. The server is already running.

## Development

```bash
npm test
npm run check
npm run check:pack
```

```text
src/launch.js      bin path, origin check, child env (unit-tested, no network)
src/skill.js       bundled jev skill provider
src/index.js       Cordis plugin: resolve the credential and mount dsh-mcp-client
skills/jev/        skill body and tool reference
locale/            display metadata (en, zh)
test/              node:test suites, including packaging invariants
```

## License and acknowledgments

This plugin is licensed under the [MIT License](LICENSE), the same license as [Jev MCP](https://github.com/jkudish/jev-mcp). It runs the upstream package and adapts its Jev skill documentation. Thanks to Joey Kudish and the contributors for their work. The upstream copyright and license are included in [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md).
