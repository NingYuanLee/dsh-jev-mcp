import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { childEnv, packageRoot, serverEntry, typesafeOrigin } from '../src/launch.js'

test('accepts an origin and rejects paths, userinfo, and queries', () => {
  assert.equal(typesafeOrigin(''), '')
  assert.equal(typesafeOrigin('  https://api.typesafe.ai/  '), 'https://api.typesafe.ai')
  assert.throws(() => typesafeOrigin('https://user:pw@api.typesafe.ai'), /user info/)
  assert.throws(() => typesafeOrigin('https://api.typesafe.ai/v1'), /origin/)
  assert.throws(() => typesafeOrigin('https://api.typesafe.ai?x=1'), /query/)
  assert.throws(() => typesafeOrigin('ftp://api.typesafe.ai'), /http or https/)
  assert.throws(() => typesafeOrigin('not a url'), /not a URL/)
})

test('builds a child env that forces TypeSafe and omits an empty base URL', () => {
  const env = childEnv({ apiKey: '  ts_test  ', model: ' jev-1.14 ', baseURL: '' })
  assert.deepEqual(env, {
    TYPESAFE_API_KEY: 'ts_test',
    JEV_PROVIDER: 'typesafe',
    JEV_MCP_MODEL: 'jev-1.14',
    TYPESAFE_BASE_URL: '', JEV_OPENROUTER_BASE_URL: '', JEV_CLOUDFLARE_BASE_URL: '', JEV_API_BASE_URL: '', CLOUDFLARE_ACCOUNT_ID: '', JEV_VERCEL_ZERO_DATA_RETENTION: '',
  })
  assert.equal(env.TYPESAFE_BASE_URL, '')
})

test('includes a validated origin and never echoes the key in errors', () => {
  const env = childEnv({ apiKey: 'ts_secret', model: '', baseURL: 'https://example.test' })
  assert.equal(env.TYPESAFE_BASE_URL, 'https://example.test')
  assert.equal(env.JEV_MCP_MODEL, 'jev-latest')
  assert.throws(() => childEnv({ apiKey: 'ts_secret', baseURL: 'https://example.test/v1' }), (error) => {
    assert.match(error.message, /origin/)
    assert.equal(error.message.includes('ts_secret'), false)
    return true
  })
  assert.throws(() => childEnv({ apiKey: 'ts_sec\nret' }), /line break/)
  assert.throws(() => childEnv({ apiKey: '   ' }), /empty/)
})

test('resolves a bin inside the package and rejects traversal', () => {
  const root = mkdtempSync(join(tmpdir(), 'jev-mcp-'))
  mkdirSync(join(root, 'dist'))
  writeFileSync(join(root, 'dist', 'index.js'), 'export {}\n')
  writeFileSync(join(root, 'package.json'), JSON.stringify({ bin: { 'jev-mcp': 'dist/index.js' } }))
  assert.equal(serverEntry(root), join(root, 'dist', 'index.js'))

  writeFileSync(join(root, 'package.json'), JSON.stringify({ bin: { 'jev-mcp': '../outside.js' } }))
  assert.throws(() => serverEntry(root), /inside the package/)
  writeFileSync(join(root, 'package.json'), JSON.stringify({ bin: {} }))
  assert.throws(() => serverEntry(root), /missing bin/)
})

test('finds the package root from a file nested under it', () => {
  const root = mkdtempSync(join(tmpdir(), 'jev-root-'))
  mkdirSync(join(root, 'dist'))
  const nested = join(root, 'dist', 'server.js')
  writeFileSync(nested, '')
  writeFileSync(join(root, 'package.json'), JSON.stringify({ name: '@jkudish/jev-mcp' }))
  assert.equal(packageRoot(nested), root)
  writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'other' }))
  assert.throws(() => packageRoot(nested), /Could not find/)
})


test('maps providers to isolated credentials and provider-specific settings', () => {
  const router = childEnv({ provider: 'openrouter', apiKey: 'router', openrouterBaseURL: 'https://example.test/api', baseURL: 'https://typesafe.test' })
  assert.equal(router.OPENROUTER_API_KEY, 'router')
  assert.equal(router.JEV_OPENROUTER_BASE_URL, 'https://example.test/api')
  assert.equal(router.TYPESAFE_BASE_URL, '')
  assert.equal(router.TYPESAFE_API_KEY, undefined)
  const cloud = childEnv({ provider: 'cloudflare', apiKey: 'cf', cloudflareAccountId: 'abc123' })
  assert.equal(cloud.JEV_CLOUDFLARE_API_TOKEN, 'cf')
  assert.equal(cloud.CLOUDFLARE_ACCOUNT_ID, 'abc123')
  assert.throws(() => childEnv({ provider: 'cloudflare', apiKey: 'x' }), /account ID/)
  const vercel = childEnv({ provider: 'vercel', apiKey: 'v', vercelZeroDataRetention: true })
  assert.equal(vercel.AI_GATEWAY_API_KEY, 'v')
  assert.equal(vercel.JEV_VERCEL_ZERO_DATA_RETENTION, 'true')
  const compatible = childEnv({ provider: 'compatible', apiKey: 'c', compatibleBaseURL: 'https://example.test/v1/systemone' })
  assert.equal(compatible.JEV_API_KEY, 'c')
  assert.equal(compatible.JEV_API_BASE_URL, 'https://example.test/v1/systemone')
  assert.throws(() => childEnv({ provider: 'compatible', apiKey: 'c' }), /required/)
  assert.throws(() => childEnv({ provider: 'openrouter', apiKey: 'c', openrouterBaseURL: 'https://u:p@example.test/api' }), /without user info/)
  assert.throws(() => childEnv({ provider: 'invalid', apiKey: 'c' }), /Unknown/)
})
