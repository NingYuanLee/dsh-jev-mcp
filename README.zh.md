# dsh-jev-mcp

[![CI](https://github.com/NingYuanLee/dsh-jev-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/NingYuanLee/dsh-jev-mcp/actions/workflows/ci.yml) [![npm](https://img.shields.io/npm/v/dsh-jev-mcp.svg)](https://www.npmjs.com/package/dsh-jev-mcp) [![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE) [![Node >=22.19](https://img.shields.io/badge/node-%3E%3D22.19.0-339933.svg)](#compatibility) [![dsh](https://img.shields.io/badge/dsh-%3E%3D0.2.1--rc.2%20%3C0.3.0--0%20%7C%7C%20%3E%3D0.2.2--0%20%3C0.3.0--0-6f42c1)](#compatibility) [![topic: dsh-plugin](https://img.shields.io/badge/topic-dsh--plugin-6f42c1.svg)](https://github.com/topics/dsh-plugin) [![powered by dsh](https://img.shields.io/badge/powered_by-dsh-4D6BFE?style=flat-square&logo=deepseek&logoColor=white)](https://github.com/deepseek-ai/deepseek-harness)

> [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的第三方社区插件，不是 DeepSeek 或 TypeSafe 的官方产品。MIT。

[English](README.md) | 中文

在 DeepSeek Harness 里运行 [@jkudish/jev-mcp](https://github.com/jkudish/jev-mcp)，并注册该服务器公布的判断工具。模型看到的名字是 `mcp__jev__*`。Jev 回答有类型的问题（核验、筛查、查找、重排、分类、抉择、对照、抽取、审计、评审、门禁、概率）。它不聊天，也不能替换正在跑这个助手的模型。见 [Jev with coding agents](https://docs.typesafe.ai/introduction/coding-agents)。

## What it does

助手可以直接调用 Jev，不必再单独配一份 MCP。插件从 DSH 凭据库读取 API Key，用 `node` 以 stdio 启动固定版本的 `@jkudish/jev-mcp`，再交给 `@deepseek-ai/dsh-mcp-client`。Key 不会写入 `cordis.patch.yml`，也不会出现在命令行参数里。

同时注册 `jev` 技能，让助手在调用前先读用法。在这个宿主里原始工具名要加前缀：`jev_verify` 对应 `mcp__jev__jev_verify`。

凭据为空时插件保持加载，技能仍在，但不注册 Jev 工具。保存凭据后会重新连接。

## How it works

1. 把内置的 `jev` 技能注册到 `ctx.skills`。用户或项目里同名技能仍然优先。
2. 用 `ctx.credentials` 解析所选供应商的密钥（TypeSafe 默认引用 `TYPESAFE_API_KEY`）。只接受凭据库中保存的值，不读取进程环境变量或 .env 文件。
3. 解析 `@jkudish/jev-mcp` 的 `bin`（0.14.7 是 `dist/index.js`），用 `process.execPath` 启动。子进程拿到所选供应商的密钥、`JEV_PROVIDER` 和 `JEV_MCP_MODEL`。
4. 挂一个 `transport: stdio` 的 `@deepseek-ai/dsh-mcp-client`。工具名、参数和结果都来自服务器，本包不重写这些工具。
5. 同名凭据发出 `credentials/reference-updated` 时，拆掉该子插件再连一次。

单次工具调用超时 2 分钟。连接断开后沿用 MCP 客户端自己的重连策略。stdio 客户端会先探活再拉起正式进程；多出来的那个进程是宿主的行为，不是本包额外复制的。

## Install

```bash
dsh plugin --profile web add dsh-jev-mcp
```

改从 GitHub 安装：

```bash
dsh plugin --profile web add github:NingYuanLee/dsh-jev-mcp
```

包还没发布时，在本目录的上一级：

```bash
dsh plugin --profile web add ./dsh-jev-mcp
```

包声明了 `dsh.bundle.patch`，所以 `dsh plugin add` 会把这一层写进 profile。当前会话里看不到工具时，重启 DeepSeek Harness。

到 [TypeSafe 控制台](https://console.typesafe.ai/settings/keys) 创建 Key，在 DSH「设置 → Jev 模型」的 Jev 模型配置中填写 API Key 和模型 ID，然后保存。密钥保存在 DSH 凭据库；留空保存会保留已存密钥。

## Configuration

| 字段 | 默认 | 含义 |
|---|---|---|
| `apiKeyEnv` | `TYPESAFE_API_KEY` | 凭据引用名。值不留在这份配置里。 |
| `serverName` | `jev` | 工具名前缀：`mcp__<serverName>__<tool>`。必须匹配 `[A-Za-z0-9_-]{1,32}`，且在同一作用域的 MCP 客户端里唯一。 |
| `model` | `jev-latest` | 传给 `JEV_MCP_MODEL`。用 `GET /v1/models` 返回的名字，例如 `jev-1.14`。 |
| `baseURL` | 空 | 可选，只能是 TypeSafe 的源站（`https://api.typesafe.ai`）。SDK 自己补路径。不能带用户信息、路径、查询或片段。 |

配置覆盖示例。后一层补丁会换掉整份 `config`，所以仍要保留的字段都要重写：

```yaml
- id: jev-mcp
  config:
    apiKeyEnv: TYPESAFE_API_KEY
    serverName: jev
    model: jev-latest
    baseURL: ""
```

Cordis 行 id 是 `jev-mcp`。包名是 `dsh-jev-mcp`。

支持 TypeSafe、OpenRouter、Cloudflare Workers AI、Vercel AI Gateway 和兼容 System One 的自定义端点。各供应商密钥分别保存在 DSH 凭据库中；Cloudflare 需要 Account ID，自定义端点需要完整的 System One URL，Vercel 可选零数据保留路由。名字里带 `KEY`、`TOKEN`、`SECRET` 或 `PASSWORD` 的环境变量会先被 MCP 客户端清掉，再套上这里显式传入的环境。

## Security

- Key 只作为所选供应商的子进程环境变量传入。
- 子进程把密钥和判断文本发给所选供应商或配置的端点。
- 本插件自己的日志不打印 Key。不要把 Key 贴进对话。
- 插件不直接读 `$DSH_HOME/.credentials.yaml`。

见 [SECURITY.md](SECURITY.md)。

## Compatibility

| 项 | 值 |
|---|---|
| dsh | `>=0.2.1-rc.2 <0.3.0-0 \|\| >=0.2.2-0 <0.3.0-0` |
| Node | `>=22.19.0` |
| 已验证 | dsh `0.2.2-rc.1` |
| Jev MCP | `@jkudish/jev-mcp@0.14.7` |
| 依赖 | `credentials`、`tools`、`skills`，以及随宿主提供的 `@deepseek-ai/dsh-mcp-client` |

展示信息在 `locale/en.json`、`locale/zh.json` 和 `icon.svg`。插件设置页提供模型和密钥配置。

## Uninstall

```bash
dsh plugin --profile <name> remove dsh-jev-mcp
```

卸载会停掉 MCP 进程，并卸掉它的工具和内置技能，不会删除已保存的供应商凭据。本包不在磁盘上另存数据。

## Troubleshooting

**没有 `mcp__jev__*` 工具。** `apiKeyEnv` 指向的凭据是空的、服务器拒绝了 Key、`@jkudish/jev-mcp` 没装上，或别的 MCP 客户端已经占用了 `serverName` `jev`。写上凭据并重启插件。缺凭据时日志会说明，但不会打印值。

**`serverName` 已被占用。** 在配置里换一个 `serverName`。公开的工具名会一起变。技能正文仍写着 `mcp__jev__*`，以配置里的名字为准。

**调用超时。** 0.1.0 的上限是每次 2 分钟，不能在配置里改。服务器自己的请求期限是 60 秒。

**助手想自己执行 `npx @jkudish/jev-mcp`。** 先加载 `jev` 技能。服务器已经在跑。

## Development

```bash
npm test
npm run check
npm run check:pack
```

```text
src/launch.js      bin 路径、源站检查、子进程环境（单测，不联网）
src/skill.js       内置 jev 技能
src/index.js       Cordis 插件：解析凭据并挂上 dsh-mcp-client
skills/jev/        技能正文和工具参考
locale/            展示文案（en、zh）
test/              node:test，含打包不变量
```

## License and acknowledgments

本插件采用与 [Jev MCP](https://github.com/jkudish/jev-mcp) 相同的 [MIT 许可证](LICENSE)，运行上游软件包并改编了其 Jev 技能文档。感谢 Joey Kudish 和所有贡献者的工作。上游版权及许可证全文见 [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md)。
