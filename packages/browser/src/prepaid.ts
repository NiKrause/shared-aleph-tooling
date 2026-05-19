import { ethCall, sendTransaction } from './evm'
import type {
  EthereumProviderLike,
  PaymentChain,
  EvmChainConfig,
  PrepaidReservation,
  PrepaidVaultSnapshot
} from './types'

const ERC20_APPROVE_SELECTOR = '0x095ea7b3' as const
const DEPOSIT_SELECTOR = '0xb6b55f25' as const
const RESERVE_SELECTOR = '0x7136e76e' as const
const CONSUME_SELECTOR = '0x6a2580db' as const
const REFUND_SELECTOR = '0xcc3e049b' as const
const TOTAL_DEPOSITED_SELECTOR = '0x53055481' as const
const AVAILABLE_BALANCE_SELECTOR = '0xa0821be3' as const
const RESERVED_BALANCE_SELECTOR = '0xe2c61aeb' as const
const RESERVATION_OF_SELECTOR = '0x0c388a74' as const

function padWord(value: string): string {
  return value.replace(/^0x/i, '').padStart(64, '0')
}

function encodeAddress(address: string): string {
  return padWord(address.toLowerCase().replace(/^0x/, ''))
}

function encodeUint256(value: bigint): string {
  return padWord(value.toString(16))
}

function encodeUint64(value: number): string {
  return padWord(BigInt(value).toString(16))
}

function encodeBytes32(value: string): string {
  return padWord(value.replace(/^0x/, ''))
}

function encodeCall(selectorValue: `0x${string}`, args: string[]): `0x${string}` {
  return `${selectorValue}${args.join('')}` as `0x${string}`
}

function normalizeHex(value: string): `0x${string}` {
  const normalized = value.startsWith('0x') ? value.toLowerCase() : `0x${value.toLowerCase()}`
  return normalized as `0x${string}`
}

function parseUint256Hex(value: string): bigint {
  const normalized = normalizeHex(value)
  if (!/^0x[0-9a-f]+$/i.test(normalized)) {
    throw new Error(`Invalid uint256 hex value: ${value}`)
  }

  return BigInt(normalized)
}

export function paymentChainFromChainId(
  chainId: string | null,
  chainConfig: Record<PaymentChain, EvmChainConfig>
): PaymentChain | null {
  if (!chainId) return null

  const normalized = chainId.toLowerCase()
  return (
    (Object.entries(chainConfig).find(([, config]) => config.chainIdHex.toLowerCase() === normalized)?.[0] as PaymentChain | undefined) ??
    null
  )
}

export function formatBudgetUnits(value: bigint, decimals = 18): number {
  const divisor = 10n ** BigInt(decimals)
  const whole = value / divisor
  const fraction = value % divisor
  return Number(whole) + Number(fraction) / 10 ** decimals
}

export async function loadPrepaidReservation(args: {
  ownerAddress: string
  intentHash: string
  vaultAddress: string
  provider: EthereumProviderLike | null | undefined
}): Promise<PrepaidReservation | null> {
  const encoded = encodeCall(RESERVATION_OF_SELECTOR, [encodeAddress(args.ownerAddress), encodeBytes32(args.intentHash)])
  const raw = await ethCall(args.vaultAddress, encoded, args.provider)
  const normalized = raw.replace(/^0x/, '').padEnd(256, '0')
  if (!normalized || /^0+$/.test(normalized)) return null

  const reservedAmount = BigInt(`0x${normalized.slice(0, 64)}`)
  const expiresAt = Number(BigInt(`0x${normalized.slice(64, 128)}`))
  const consumed = BigInt(`0x${normalized.slice(128, 192)}`) !== 0n
  const owner = `0x${normalized.slice(216, 256)}`
  if (reservedAmount === 0n) return null

  return {
    intentHash: args.intentHash,
    ownerAddress: owner.toLowerCase() === args.ownerAddress.toLowerCase() ? args.ownerAddress : owner,
    reservedAmount,
    expiresAt,
    consumed,
    expired: expiresAt <= Math.floor(Date.now() / 1000)
  }
}

async function readUint256(args: {
  selector: `0x${string}`
  ownerAddress: string
  vaultAddress: string
  provider: EthereumProviderLike | null | undefined
}): Promise<bigint> {
  const encoded = encodeCall(args.selector, [encodeAddress(args.ownerAddress)])
  const raw = await ethCall(args.vaultAddress, encoded, args.provider)
  return parseUint256Hex(raw)
}

export async function loadPrepaidVaultSnapshot(args: {
  ownerAddress: string
  currentIntentHash?: string | null
  vaultAddress: string
  provider: EthereumProviderLike | null | undefined
}): Promise<PrepaidVaultSnapshot> {
  const [totalDeposited, availableBalance, reservedBalance, currentReservation] = await Promise.all([
    readUint256({
      selector: TOTAL_DEPOSITED_SELECTOR,
      ownerAddress: args.ownerAddress,
      vaultAddress: args.vaultAddress,
      provider: args.provider
    }),
    readUint256({
      selector: AVAILABLE_BALANCE_SELECTOR,
      ownerAddress: args.ownerAddress,
      vaultAddress: args.vaultAddress,
      provider: args.provider
    }),
    readUint256({
      selector: RESERVED_BALANCE_SELECTOR,
      ownerAddress: args.ownerAddress,
      vaultAddress: args.vaultAddress,
      provider: args.provider
    }),
    args.currentIntentHash
      ? loadPrepaidReservation({
          ownerAddress: args.ownerAddress,
          intentHash: args.currentIntentHash,
          vaultAddress: args.vaultAddress,
          provider: args.provider
        })
      : Promise.resolve(null)
  ])

  return {
    totalDeposited,
    availableBalance,
    reservedBalance,
    currentReservation
  }
}

export async function approvePrepaidBudget(args: {
  ownerAddress: string
  amount: bigint
  tokenAddress: string
  vaultAddress: string
  provider: EthereumProviderLike | null | undefined
}): Promise<string> {
  return sendTransaction(
    {
      from: args.ownerAddress,
      to: args.tokenAddress,
      data: encodeCall(ERC20_APPROVE_SELECTOR, [encodeAddress(args.vaultAddress), encodeUint256(args.amount)])
    },
    args.provider
  )
}

export async function depositPrepaidBudget(args: {
  ownerAddress: string
  amount: bigint
  vaultAddress: string
  provider: EthereumProviderLike | null | undefined
}): Promise<string> {
  return sendTransaction(
    {
      from: args.ownerAddress,
      to: args.vaultAddress,
      data: encodeCall(DEPOSIT_SELECTOR, [encodeUint256(args.amount)])
    },
    args.provider
  )
}

export async function reserveDeploymentBudget(args: {
  ownerAddress: string
  intentHash: string
  amount: bigint
  expiresAt: number
  vaultAddress: string
  provider: EthereumProviderLike | null | undefined
}): Promise<string> {
  return sendTransaction(
    {
      from: args.ownerAddress,
      to: args.vaultAddress,
      data: encodeCall(RESERVE_SELECTOR, [
        encodeBytes32(args.intentHash),
        encodeUint256(args.amount),
        encodeUint64(args.expiresAt)
      ])
    },
    args.provider
  )
}

export async function consumeDeploymentReservation(args: {
  ownerAddress: string
  intentHash: string
  amount: bigint
  vaultAddress: string
  provider: EthereumProviderLike | null | undefined
}): Promise<string> {
  return sendTransaction(
    {
      from: args.ownerAddress,
      to: args.vaultAddress,
      data: encodeCall(CONSUME_SELECTOR, [encodeBytes32(args.intentHash), encodeUint256(args.amount)])
    },
    args.provider
  )
}

export async function refundExpiredReservation(args: {
  ownerAddress: string
  intentHash: string
  vaultAddress: string
  provider: EthereumProviderLike | null | undefined
}): Promise<string> {
  return sendTransaction(
    {
      from: args.ownerAddress,
      to: args.vaultAddress,
      data: encodeCall(REFUND_SELECTOR, [encodeBytes32(args.intentHash)])
    },
    args.provider
  )
}
