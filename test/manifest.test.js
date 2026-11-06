import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { skillProvider, SKILL_DESCRIPTION, SKILL_NAME } from '../src/skill.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (relative) => readFileSync(join(root, relative), 'utf8')
const readJson = (relative) => JSON.parse(read(relative))
const pkg = readJson('package.json')

test('declares an installable bundle with the current manifest version', () => {
  assert.equal(pkg.private, undefined)
  assert.equal(pkg.dsh?.manifestVersion, 1)
  assert.equal(pkg.dsh?.bundle?.patch, './cordis.patch.yml')
  assert.equal(pkg.repository?.url, 'git+https://github.com/NingYuanLee/dsh-jev-mcp.git')
  const patch = read('cordis.patch.yml')
  assert.match(patch, /id:\s*jev-mcp/)
  assert.match(patch, /name:\s*dsh-jev-mcp/)
})

test('declares the verified dsh and node ranges and peer baselines', () => {
  assert.equal(pkg.engines?.dsh, '>=0.2.1-rc.2 <0.3.0-0 || >=0.2.2-0 <0.3.0-0')
  assert.equal(pkg.engines?.node, '>=22.19.0')
  assert.equal(pkg.peerDependencies?.['@deepseek-ai/cordis'], '>=4.0.4 <5.0.0')
  assert.equal(pkg.peerDependencies?.['@deepseek-ai/dsh-credentials'], '>=0.2.1-0 <0.3.0-0 || >=0.2.2-0 <0.3.0-0')
  assert.equal(pkg.peerDependencies?.['@deepseek-ai/dsh-mcp-client'], '>=0.2.1-0 <0.3.0-0 || >=0.2.2-0 <0.3.0-0')
  assert.equal(pkg.peerDependencies?.['@deepseek-ai/schemastery'], '>=3.18.4 <4.0.0')
  assert.deepEqual(pkg.dependencies, { '@jkudish/jev-mcp': '0.14.7' })
  for (const name of Object.keys(pkg.dependencies)) {
    assert.equal(name.startsWith('@deepseek-ai/'), false)
  }
})

test('publishes locale display metadata', () => {
  assert.equal(pkg.exports?.['./locale/*.json'], './locale/*.json')
  assert.equal(pkg.exports?.['./icon'], './icon.svg')
  for (const lang of ['en', 'zh']) {
    const meta = readJson(`locale/${lang}.json`)
    assert.notEqual(meta.meta?.title?.trim(), '')
    assert.notEqual(meta.meta?.description?.trim(), '')
  }
})

test('exports an icon within the harness size limit', () => {
  const icon = join(root, 'icon.svg')
  assert.ok(existsSync(icon))
  const size = statSync(icon).size
  assert.ok(size > 0)
  assert.ok(size <= 256 * 1024)
})

test('lists runtime and metadata files and documents install plus uninstall', () => {
  for (const entry of ['src', 'skills', 'cordis.patch.yml', 'locale', 'icon.svg', 'SECURITY.md', 'README*.md', 'CHANGELOG.md', 'LICENSE', 'THIRD_PARTY_LICENSES.md']) {
    assert.ok(pkg.files.includes(entry), `files includes ${entry}`)
  }
  for (const name of ['README.md', 'README.zh.md']) {
    const text = read(name)
    assert.match(text, /dsh plugin --profile web add dsh-jev-mcp/)
    assert.match(text, /dsh plugin --profile <name> remove dsh-jev-mcp/)
  }
})

test('keeps matching level-2 headings in both READMEs', () => {
  const headingsOf = (text) => text.split(/\r?\n/u)
    .filter((line) => line.startsWith('## '))
    .map((line) => line.slice(3).trim())
  const base = headingsOf(read('README.md'))
  assert.ok(base.length > 0)
  const translated = headingsOf(read('README.zh.md'))
  assert.deepEqual(translated, base)
})

test('ships a jev skill that uses harness tool names and does not spawn npx', async () => {
  assert.equal(SKILL_NAME, 'jev')
  assert.ok(SKILL_DESCRIPTION.length <= 500)
  assert.match(SKILL_DESCRIPTION, /mcp__jev__jev_verify/)
  const listed = await skillProvider.list()
  assert.equal(listed.length, 1)
  assert.equal(listed[0].name, 'jev')
  assert.equal(listed[0].rank, 600)
  const loaded = await skillProvider.get(listed[0])
  assert.match(loaded.content, /name: jev/)
  assert.match(loaded.content, /mcp__jev__jev_verify/)
  assert.match(loaded.content, /mcp__jev__jev_gate/)
  assert.doesNotMatch(loaded.content, /mcpServers:/)
  assert.match(loaded.content, /Do not start `npx @jkudish\/jev-mcp`/)
  assert.match(read('skills/jev/reference/tools.md'), /mcp__jev__<name>/)
})
