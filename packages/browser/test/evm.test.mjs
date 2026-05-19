import assert from 'node:assert/strict'
import test from 'node:test'

import { ethCall, personalSign, sendTransaction } from '../dist/index.js'

test('ethCall forwards a standard eth_call request', async () => {
  const calls = []
  const provider = {
    async request(args) {
      calls.push(args)
      return '0x1234'
    }
  }

  const result = await ethCall('0xabc', '0xdeadbeef', provider)

  assert.equal(result, '0x1234')
  assert.deepEqual(calls, [
    {
      method: 'eth_call',
      params: [
        {
          to: '0xabc',
          data: '0xdeadbeef'
        },
        'latest'
      ]
    }
  ])
})

test('sendTransaction hex-encodes bigint value for eth_sendTransaction', async () => {
  const calls = []
  const provider = {
    async request(args) {
      calls.push(args)
      return '0xtxhash'
    }
  }

  const result = await sendTransaction(
    {
      from: '0xfrom',
      to: '0xto',
      data: '0x1234',
      value: 255n
    },
    provider
  )

  assert.equal(result, '0xtxhash')
  assert.deepEqual(calls, [
    {
      method: 'eth_sendTransaction',
      params: [
        {
          from: '0xfrom',
          to: '0xto',
          data: '0x1234',
          value: '0xff'
        }
      ]
    }
  ])
})

test('personalSign hex-encodes utf8 message bytes', async () => {
  const calls = []
  const provider = {
    async request(args) {
      calls.push(args)
      return '0xsigned'
    }
  }

  const result = await personalSign('0xabc', 'hello', provider)

  assert.equal(result, '0xsigned')
  assert.deepEqual(calls, [
    {
      method: 'personal_sign',
      params: ['0x68656c6c6f', '0xabc']
    }
  ])
})

test('EVM helpers reject missing providers with the existing wallet error', async () => {
  await assert.rejects(() => ethCall('0xabc', '0x1234', null), /MetaMask provider not found\./)
  await assert.rejects(() => sendTransaction({ from: '0xfrom', to: '0xto' }, null), /MetaMask provider not found\./)
  await assert.rejects(() => personalSign('0xabc', 'hello', null), /MetaMask provider not found\./)
})
