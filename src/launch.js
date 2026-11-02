/**
 * Pure helpers for launching @jkudish/jev-mcp.
 * No credential lookup and no process spawn, so tests stay offline.
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'

export const DEFAULT_MODEL = 'jev-latest'
export const DEFAULT_SERVER_NAME = 'jev'
export const SERVER_NAME = /^[A-Za-z0-9_-]{1,32}$/
/** Covers the server's own request deadline (default 60s) plus its retries. */
export const TOOL_CALL_TIMEOUT_MS = 120_000

/**
 * Walk up from a resolved file to the installed `@jkudish/jev-mcp` root.
 * That package does not export `./package.json`, so resolving the subpath throws.
 * @param {string} resolvedFile
 */
export function packageRoot(resolvedFile) {
  let dir = dirname(resolve(resolvedFile))
  for (let i = 0; i < 8; i += 1) {
    const pkgPath = join(dir, 'package.json')
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
      if (pkg?.name === '@jkudish/jev-mcp') return dir
    }
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  throw new Error('Could not find the installed @jkudish/jev-mcp package')
}

/**
 * Resolve the jev-mcp bin from an installed package root.
 * The bin field must stay inside that root.
 * @param {string} rootDir
 */
export function serverEntry(rootDir) {
  const root = resolve(rootDir)
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
  const bin = pkg?.bin?.['jev-mcp']
  if (typeof bin !== 'string' || bin.trim() === '') {
    throw new Error('jev-mcp package is missing bin.jev-mcp')
  }
  if (isAbsolute(bin) || bin.split(/[\\/]/u).includes('..')) {
    throw new Error('jev-mcp bin path is not inside the package')
  }
  const entry = resolve(root, bin)
  const rel = relative(root, entry)
  if (rel.startsWith('..') || isAbsolute(rel)) {
    throw new Error('jev-mcp bin path is not inside the package')
  }
  if (!existsSync(entry)) throw new Error(`jev-mcp bin is not installed: ${bin}`)
  return entry
}

/**
 * TypeSafe direct base URL. The SDK appends its own route, so only an origin is accepted.
 * An empty value means "use the SDK default".
 * @param {string} raw
 * @returns {string}
 */
export function typesafeOrigin(raw) {
  if (typeof raw !== 'string' || raw.trim() === '') return ''
  let url
  try {
    url = new URL(raw.trim())
  } catch {
    throw new Error('TYPESAFE_BASE_URL is not a URL')
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('TYPESAFE_BASE_URL must use http or https')
  }
  if (url.username !== '' || url.password !== '') {
    throw new Error('TYPESAFE_BASE_URL must not contain user info')
  }
  if (url.pathname !== '/' && url.pathname !== '') {
    throw new Error('TYPESAFE_BASE_URL must be an origin; the SDK appends the route')
  }
  if (url.search !== '' || url.hash !== '') {
    throw new Error('TYPESAFE_BASE_URL must not contain a query or fragment')
  }
  return url.origin
}

export const PROVIDER_KEYS = Object.freeze({
  typesafe: 'TYPESAFE_API_KEY', openrouter: 'OPENROUTER_API_KEY',
  cloudflare: 'JEV_CLOUDFLARE_API_TOKEN', vercel: 'AI_GATEWAY_API_KEY', compatible: 'JEV_API_KEY',
})

function endpoint(raw, required = false) {
  if (!raw?.trim()) {
    if (required) throw new Error('Provider endpoint is required')
    return ''
  }
  let url
  try { url = new URL(raw.trim()) } catch { throw new Error('Provider endpoint is not a URL') }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.hash || url.search) {
    throw new Error('Provider endpoint must be an http(s) URL without user info, query, or fragment')
  }
  return raw.trim()
}

/** Build the explicit environment for one selected provider. */
export function childEnv(input) {
  const provider = input?.provider || 'typesafe'
  const keyName = PROVIDER_KEYS[provider]
  if (!keyName) throw new Error('Unknown Jev provider')
  const apiKey = input?.apiKey
  if (typeof apiKey !== 'string' || apiKey.trim() === '') throw new Error('Provider API key is empty')
  if (/[\r\n\0]/u.test(apiKey)) throw new Error('Provider API key contains a line break')
  const model = typeof input.model === 'string' && input.model.trim() ? input.model.trim() : DEFAULT_MODEL
  if (/[\r\n\0]/u.test(model)) throw new Error('Jev model name contains a line break')
  const env = { TYPESAFE_BASE_URL: '', JEV_OPENROUTER_BASE_URL: '', JEV_CLOUDFLARE_BASE_URL: '', JEV_API_BASE_URL: '', CLOUDFLARE_ACCOUNT_ID: '', JEV_VERCEL_ZERO_DATA_RETENTION: '', [keyName]: apiKey.trim(), JEV_PROVIDER: provider, JEV_MCP_MODEL: model }
  if (provider === 'typesafe') {
    const origin = typesafeOrigin(input.baseURL ?? '')
    if (origin) env.TYPESAFE_BASE_URL = origin
  } else if (provider === 'openrouter' || provider === 'cloudflare') {
    const url = endpoint(provider === 'openrouter' ? input.openrouterBaseURL : input.cloudflareBaseURL)
    if (url) env[provider === 'openrouter' ? 'JEV_OPENROUTER_BASE_URL' : 'JEV_CLOUDFLARE_BASE_URL'] = url
    if (provider === 'cloudflare') {
      const account = typeof input.cloudflareAccountId === 'string' ? input.cloudflareAccountId.trim() : ''
      if (!/^[A-Za-z0-9_-]+$/.test(account)) throw new Error('Cloudflare account ID is required and must be valid')
      env.CLOUDFLARE_ACCOUNT_ID = account
    }
  } else if (provider === 'compatible') {
    env.JEV_API_BASE_URL = endpoint(input.compatibleBaseURL, true)
  } else if (provider === 'vercel' && input.vercelZeroDataRetention) {
    env.JEV_VERCEL_ZERO_DATA_RETENTION = 'true'
  }
  return env
}
