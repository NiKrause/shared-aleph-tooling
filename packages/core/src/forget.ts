import type { AlephBroadcastMessage, DeploymentProgressListener, MessageHasher, MessageSigner } from '@le-space/shared-types'

import { broadcastAlephMessage, normalizeBroadcastStatus, type JsonFetchLike, signAlephMessage } from './broadcast.ts'
import { DEFAULT_ALEPH_CHANNEL } from './constants.ts'

function asOptionalReason(value: string | undefined): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

export async function createUnsignedForgetMessage(args: {
  sender: string
  hashes?: string[]
  aggregates?: string[]
  reason?: string
  hasher: MessageHasher
  channel?: string
  now?: number
}): Promise<Omit<AlephBroadcastMessage, 'signature'>> {
  const content = {
    address: args.sender,
    time: args.now ?? Date.now() / 1000,
    hashes: [...new Set((args.hashes ?? []).filter(Boolean))],
    aggregates: [...new Set((args.aggregates ?? []).filter(Boolean))],
    reason: asOptionalReason(args.reason)
  }

  if (content.hashes.length === 0 && content.aggregates.length === 0) {
    throw new Error('FORGET message requires at least one hash or aggregate key.')
  }

  const itemContent = JSON.stringify(content)
  const itemHash = await args.hasher(itemContent)

  return {
    sender: args.sender,
    chain: 'ETH',
    type: 'FORGET',
    item_hash: itemHash,
    item_type: 'inline',
    item_content: itemContent,
    time: args.now ?? Date.now() / 1000,
    channel: args.channel ?? DEFAULT_ALEPH_CHANNEL
  }
}

export async function forgetAlephMessages(args: {
  sender: string
  hashes?: string[]
  aggregates?: string[]
  reason?: string
  signer: MessageSigner
  hasher: MessageHasher
  fetch: JsonFetchLike
  channel?: string
  apiHost?: string
  sync?: boolean
  now?: number
  onProgress?: DeploymentProgressListener
}) {
  args.onProgress?.({
    stage: 'building-delete-message',
    label: 'Building delete message',
    progress: 18,
    status: 'info',
    itemHash: null,
    detail: [...new Set((args.hashes ?? []).filter(Boolean))].join(', ') || null,
    error: null,
    timestamp: Date.now()
  })
  const unsignedMessage = await createUnsignedForgetMessage({
    sender: args.sender,
    hashes: args.hashes,
    aggregates: args.aggregates,
    reason: args.reason,
    hasher: args.hasher,
    channel: args.channel,
    now: args.now
  })
  args.onProgress?.({
    stage: 'signing-delete-message',
    label: 'Waiting for delete signature',
    progress: 42,
    status: 'info',
    itemHash: unsignedMessage.item_hash,
    detail: unsignedMessage.item_hash,
    error: null,
    timestamp: Date.now()
  })
  const message = await signAlephMessage(unsignedMessage, args.signer)
  args.onProgress?.({
    stage: 'broadcasting-delete',
    label: 'Broadcasting delete to Aleph',
    progress: 68,
    status: 'warning',
    itemHash: message.item_hash,
    detail: message.item_hash,
    error: null,
    timestamp: Date.now()
  })
  const { response, httpStatus } = await broadcastAlephMessage(message, {
    apiHost: args.apiHost,
    sync: args.sync,
    fetch: args.fetch
  })

  const status = normalizeBroadcastStatus(httpStatus, response?.message_status)
  args.onProgress?.({
    stage: status === 'rejected' ? 'error' : 'delete-completed',
    label: status === 'rejected' ? 'Delete rejected by Aleph' : 'Delete submitted to Aleph',
    progress: 100,
    status: status === 'rejected' ? 'error' : 'success',
    itemHash: message.item_hash,
    detail: status === 'rejected' ? String(response?.details ?? 'Aleph rejected this delete request.') : null,
    error: status === 'rejected' ? String(response?.details ?? 'Aleph rejected this delete request.') : null,
    timestamp: Date.now()
  })

  return {
    sender: args.sender,
    itemHash: message.item_hash,
    response,
    httpStatus,
    status
  }
}

export async function cleanupFailedDeployment(args: {
  sender: string
  instanceItemHash: string
  reason?: string
  signer: MessageSigner
  hasher: MessageHasher
  fetch: JsonFetchLike
  channel?: string
  apiHost?: string
}) {
  try {
    return await forgetAlephMessages({
      sender: args.sender,
      hashes: [args.instanceItemHash],
      reason: args.reason ?? 'Discard failed deployment attempt',
      signer: args.signer,
      hasher: args.hasher,
      fetch: args.fetch,
      channel: args.channel,
      apiHost: args.apiHost
    })
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error)
    }
  }
}
