import assert from 'node:assert/strict'
import test from 'node:test'

import { formatDateTime, shortHash } from '../dist/shared/index.js'

test('shortHash compresses long hashes', () => {
  assert.equal(shortHash('abcdef0123456789', 4, 4), 'abcd...6789')
})

test('formatDateTime treats Unix-second timestamps as seconds', () => {
  const formatted = formatDateTime(1747962535)
  assert.equal(/1970/.test(formatted), false)
})
