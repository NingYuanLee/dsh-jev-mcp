import { test } from 'node:test'
import assert from 'node:assert/strict'
import { storedKey, configValue, Config } from '../src/index.js'

test('uses only credentials saved in the local store', () => {
  assert.equal(storedKey({ source: 'file', value: ' key ' }), 'key')
  for (const source of ['env', 'project-env', 'user-env']) {
    assert.equal(storedKey({ source, value: 'ambient' }), undefined)
  }
  assert.equal(storedKey(undefined), undefined)
})

test('model settings are editable volatile fields and resolve live values', () => {
  assert.equal(Config.dict.model.meta.volatile, true)
  assert.equal(Config.dict.baseURL.meta.volatile, true)
  assert.equal(configValue({ get: () => 'jev-1.14' }), 'jev-1.14')
  assert.equal(configValue('jev-latest'), 'jev-latest')
})
