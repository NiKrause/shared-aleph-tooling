import assert from 'node:assert/strict'
import test from 'node:test'

import {
  approvePrepaidBudget,
  consumeDeploymentReservation,
  depositPrepaidBudget,
  formatBudgetUnits,
  loadPrepaidReservation,
  loadPrepaidVaultSnapshot,
  paymentChainFromChainId,
  refundExpiredReservation,
  reserveDeploymentBudget
} from '../dist/index.js'

const EVM_CHAIN_CONFIG = {
  BASE: {
    alephChain: 'BASE',
    chainIdHex: '0x2105',
    chainName: 'Base',
    rpcUrls: ['https://mainnet.base.org'],
    blockExplorerUrls: ['https://basescan.org'],
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
  },
  AVAX: {
    alephChain: 'AVAX',
    chainIdHex: '0xa86a',
    chainName: 'Avalanche C-Chain',
    rpcUrls: ['https://api.avax.network/ext/bc/C/rpc'],
    blockExplorerUrls: ['https://snowtrace.io'],
    nativeCurrency: { name: 'Avalanche', symbol: 'AVAX', decimals: 18 }
  },
  ETH: {
    alephChain: 'ETH',
    chainIdHex: '0x1',
    chainName: 'Ethereum Mainnet',
    rpcUrls: ['https://ethereum.publicnode.com'],
    blockExplorerUrls: ['https://etherscan.io'],
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
  }
}

test('paymentChainFromChainId maps supported chain ids', () => {
  assert.equal(paymentChainFromChainId('0x1', EVM_CHAIN_CONFIG), 'ETH')
  assert.equal(paymentChainFromChainId('0x2105', EVM_CHAIN_CONFIG), 'BASE')
  assert.equal(paymentChainFromChainId('0xa86a', EVM_CHAIN_CONFIG), 'AVAX')
  assert.equal(paymentChainFromChainId('0x2a', EVM_CHAIN_CONFIG), null)
})

test('formatBudgetUnits formats 18-decimal token units', () => {
  assert.equal(formatBudgetUnits(15_500000000000000000n), 15.5)
})

test('loadPrepaidReservation decodes reservation state from eth_call', async () => {
  const provider = {
    async request() {
      const ownerWord = '0000000000000000000000000123456789abcdef0123456789abcdef01234567'
      const raw =
        '0x' +
        '0000000000000000000000000000000000000000000000000000000000000064' +
        '0000000000000000000000000000000000000000000000000000000068c6f5b0' +
        '0000000000000000000000000000000000000000000000000000000000000001' +
        ownerWord
      return raw
    }
  }

  const result = await loadPrepaidReservation({
    ownerAddress: '0x0123456789abcdef0123456789abcdef01234567',
    intentHash: 'ab'.repeat(32),
    vaultAddress: '0xvault',
    provider
  })

  assert.equal(result?.reservedAmount, 100n)
  assert.equal(result?.consumed, true)
  assert.equal(result?.ownerAddress, '0x0123456789abcdef0123456789abcdef01234567')
})

test('loadPrepaidVaultSnapshot aggregates three uint256 reads and optional reservation', async () => {
  const responses = [
    '0x01',
    '0x02',
    '0x03',
    '0x' +
      '0000000000000000000000000000000000000000000000000000000000000004' +
      '0000000000000000000000000000000000000000000000000000000068c6f5b0' +
      '0000000000000000000000000000000000000000000000000000000000000000' +
      '0000000000000000000000000123456789abcdef0123456789abcdef01234567'
  ]
  const calls = []
  const provider = {
    async request(args) {
      calls.push(args)
      return responses.shift()
    }
  }

  const snapshot = await loadPrepaidVaultSnapshot({
    ownerAddress: '0x0123456789abcdef0123456789abcdef01234567',
    currentIntentHash: 'cd'.repeat(32),
    vaultAddress: '0xvault',
    provider
  })

  assert.equal(snapshot.totalDeposited, 1n)
  assert.equal(snapshot.availableBalance, 2n)
  assert.equal(snapshot.reservedBalance, 3n)
  assert.equal(snapshot.currentReservation?.reservedAmount, 4n)
  assert.equal(calls.length, 4)
})

test('prepaid transaction helpers forward encoded transaction requests', async () => {
  const calls = []
  const provider = {
    async request(args) {
      calls.push(args)
      return '0xtx'
    }
  }

  await approvePrepaidBudget({
    ownerAddress: '0xowner',
    amount: 10n,
    tokenAddress: '0xtoken',
    vaultAddress: '0xvault',
    provider
  })
  await depositPrepaidBudget({
    ownerAddress: '0xowner',
    amount: 11n,
    vaultAddress: '0xvault',
    provider
  })
  await reserveDeploymentBudget({
    ownerAddress: '0xowner',
    intentHash: 'ef'.repeat(32),
    amount: 12n,
    expiresAt: 60,
    vaultAddress: '0xvault',
    provider
  })
  await consumeDeploymentReservation({
    ownerAddress: '0xowner',
    intentHash: 'ab'.repeat(32),
    amount: 13n,
    vaultAddress: '0xvault',
    provider
  })
  await refundExpiredReservation({
    ownerAddress: '0xowner',
    intentHash: 'cd'.repeat(32),
    vaultAddress: '0xvault',
    provider
  })

  assert.equal(calls.length, 5)
  assert.equal(calls.every((call) => call.method === 'eth_sendTransaction'), true)
})
