/**
 * Host bundle for @jkudish/jev-mcp.
 *
 * Jev is not a chat model. This plugin does not register an LLM provider.
 * It spawns the Jev MCP server over stdio and lets @deepseek-ai/dsh-mcp-client
 * publish that server's tools. The API key stays in the credential store.
 */
import { createRequire } from 'node:module'
import { dirname } from 'node:path'
import { apply as connectMcp, Config as McpConfig } from '@deepseek-ai/dsh-mcp-client'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import z from '@deepseek-ai/schemastery'
import { childEnv, PROVIDER_KEYS, DEFAULT_MODEL, DEFAULT_SERVER_NAME, packageRoot, serverEntry, SERVER_NAME, TOOL_CALL_TIMEOUT_MS } from './launch.js'
import { skillProvider } from './skill.js'

export { childEnv, packageRoot, serverEntry }

export const name = 'jev-mcp'
export const inject = ['credentials', 'tools', 'skills']

const require = createRequire(import.meta.url)

export const Config = z.object({
  apiKeyEnv: z.string().role('credential-ref').default('TYPESAFE_API_KEY').volatile(),
  serverName: z.string().pattern(SERVER_NAME).default(DEFAULT_SERVER_NAME),
  provider: z.union(['typesafe', 'openrouter', 'cloudflare', 'vercel', 'compatible']).default('typesafe').volatile(),
  openrouterBaseURL: z.string().default('').volatile(),
  cloudflareBaseURL: z.string().default('').volatile(),
  cloudflareAccountId: z.string().default('').volatile(),
  compatibleBaseURL: z.string().default('').volatile(),
  vercelZeroDataRetention: z.boolean().default(false).volatile(),
  model: z.string().default(DEFAULT_MODEL).volatile(),
  baseURL: z.string().default('').volatile(),
})

const mcpPlugin = {
  name: 'jev-mcp-connection',
  inject: ['tools'],
  Config: McpConfig,
  apply: connectMcp,
}

export function configValue(value) {
  return value && typeof value.get === 'function' ? value.get() : value
}

export function storedKey(resolved) {
  return resolved?.source === 'file' ? resolved.value?.trim() : undefined
}

export async function apply(ctx, config) {
  try {
    const disposeSkill = ctx.skills.registerProvider(() => skillProvider)
    if (typeof disposeSkill === 'function') ctx.effect(() => disposeSkill)
  } catch (error) {
    ctx.logger.error('Jev skill 没有注册上。MCP 连接仍会继续。')
    ctx.logger.error(error)
  }

  let generation = 0
  let fiber
  let queue = Promise.resolve()

  const stop = () => {
    generation += 1
    fiber?.dispose()
    fiber = undefined
  }

  async function connect(token) {
    fiber?.dispose()
    fiber = undefined
    if (token !== generation) return

    const provider = configValue(config.provider) || 'typesafe'
    const refName = provider === 'typesafe' ? configValue(config.apiKeyEnv) : PROVIDER_KEYS[provider]
    if (!refName) { ctx.logger.error('Jev 供应商配置无效。'); return }
    let key
    try {
      const resolved = await ctx.credentials.resolve(credentialRef(refName))
      // The local provider identifies its managed credential store as `file`.
      // Do not fall back to process or .env values.
      key = storedKey(resolved)
    } catch (error) {
      ctx.logger.error(error)
      return
    }
    if (token !== generation) return
    if (!key) {
      ctx.logger.warn(`Jev MCP 未连接：凭据 ${refName} 还没有值。在插件设置里保存 API Key 后会自动连接。`)
      return
    }

    let entry
    let env
    try {
      entry = serverEntry(packageRoot(require.resolve('@jkudish/jev-mcp')))
      env = childEnv({ apiKey: key, provider, ...Object.fromEntries(['model', 'baseURL', 'openrouterBaseURL', 'cloudflareBaseURL', 'cloudflareAccountId', 'compatibleBaseURL', 'vercelZeroDataRetention'].map(name => [name, configValue(config[name])])) })
    } catch (error) {
      ctx.logger.error('Jev MCP 无法启动。密钥本身不会写在这条日志里。')
      ctx.logger.error(error)
      return
    }
    if (token !== generation) return

    const next = ctx.plugin(mcpPlugin, {
      transport: 'stdio',
      serverName: config.serverName,
      command: process.execPath,
      args: [entry],
      env,
      cwd: dirname(entry),
      toolCallTimeoutMs: TOOL_CALL_TIMEOUT_MS,
      failOnStartupError: false,
    })
    if (token !== generation) {
      next.dispose()
      return
    }
    fiber = next
    void Promise.resolve(next).catch((error) => {
      if (token !== generation) return
      ctx.logger.error('Jev MCP 连接失败。请检查 API Key、model 和 baseURL。密钥本身不会写在这条日志里。')
      ctx.logger.error(error)
    })
  }

  function schedule() {
    const token = ++generation
    const run = queue.then(() => connect(token))
    queue = run.then(() => {}, () => {})
    return run
  }

  ctx.on('credentials/reference-updated', (ref) => {
    if (![configValue(config.apiKeyEnv), ...Object.values(PROVIDER_KEYS)].includes(String(ref))) return
    void schedule()
  })
  ctx.on('loader/volatile-update', () => { void schedule() })
  ctx.effect(() => stop)

  await schedule()
}
