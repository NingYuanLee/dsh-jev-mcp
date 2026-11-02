/**
 * Bundled `jev` skill. Instructions live in skills/jev and are read on each load.
 */
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

export const SKILL_NAME = 'jev'
export const PROVIDER_NAME = 'dsh-jev-mcp'
/** Filesystem provider rank 600 is the bundled tier, so a user copy of `jev` wins. */
export const BUNDLED_SKILL_RANK = 600

export const SKILL_DESCRIPTION = 'Typed Jev judgments for screening, claim checks, semantic selection, extraction, patch review, and completion gates. In DeepSeek Harness call mcp__jev__jev_verify and the other mcp__jev__* tools. Do not spawn npx. Skip Jev when rg or an exact match already decides.'

const BODY_URL = new URL('../skills/jev/SKILL.md', import.meta.url)
const RESOURCE_BASE = {
  kind: 'directory',
  path: fileURLToPath(new URL('../skills/jev/', import.meta.url)),
}

export const skillCandidate = {
  name: SKILL_NAME,
  description: SKILL_DESCRIPTION,
  invocation: { modelInvocable: true, userInvocable: true },
  provider: PROVIDER_NAME,
  source: 'bundled',
  resourceBase: RESOURCE_BASE,
  rank: BUNDLED_SKILL_RANK,
  locator: BODY_URL,
}

export const skillProvider = {
  name: PROVIDER_NAME,
  list: () => Promise.resolve([skillCandidate]),
  async get() {
    return {
      name: SKILL_NAME,
      description: SKILL_DESCRIPTION,
      invocation: skillCandidate.invocation,
      provider: PROVIDER_NAME,
      source: 'bundled',
      resourceBase: RESOURCE_BASE,
      content: await readFile(BODY_URL, 'utf8'),
    }
  },
}
