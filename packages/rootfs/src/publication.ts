import { join } from "node:path";

import type { RootfsBuildPlan } from "./build-plan.ts";

export interface RootfsIpfsAddEntry {
  Name?: string;
  Hash?: string;
  Size?: string | number;
}

export interface RootfsStoreMessageResponse {
  item_hash: string;
}

export interface RootfsPublicationArtifacts {
  ipfsAddResponsePath: string;
  storeMessagePath: string;
  storeMessageStderrPath: string;
}

export interface RootfsPublicationResult {
  cid: string;
  itemHash: string;
  sourceSizeBytes?: number;
}

export interface RootfsStoreMessageStatus {
  status: string;
  rejectionSummary?: string;
}

export function publicationArtifacts(plan: RootfsBuildPlan): RootfsPublicationArtifacts {
  return {
    ipfsAddResponsePath: join(plan.outDir, 'ipfs-add-response.jsonl'),
    storeMessagePath: join(plan.outDir, 'store-message.json'),
    storeMessageStderrPath: join(plan.outDir, 'store-message.stderr.log'),
  };
}

export function parseIpfsAddResponse(content: string): RootfsIpfsAddEntry[] {
  return content
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as RootfsIpfsAddEntry);
}

export function extractRootfsCid(entries: RootfsIpfsAddEntry[]): string {
  if (entries.length === 0) {
    throw new Error('No response received from the IPFS add endpoint');
  }
  const cid = entries.at(-1)?.Hash?.trim();
  if (!cid) {
    throw new Error(`IPFS add response did not include a Hash: ${JSON.stringify(entries.at(-1) ?? {})}`);
  }
  return cid;
}

export function extractRootfsSourceSizeBytes(entries: RootfsIpfsAddEntry[]): number | undefined {
  const size = entries.at(-1)?.Size;
  if (typeof size === 'number' && Number.isFinite(size) && size > 0) {
    return size;
  }
  if (typeof size === 'string' && /^\d+$/u.test(size)) {
    return Number(size);
  }
  return undefined;
}

export function parseStoreMessageResponse(content: string): RootfsStoreMessageResponse {
  const payload = JSON.parse(content) as Partial<RootfsStoreMessageResponse>;
  const itemHash = payload.item_hash?.trim();
  if (!itemHash) {
    throw new Error('Failed to extract Aleph item hash from store message response');
  }
  return { item_hash: itemHash };
}

export function summarizeStoreMessageFailure(stderrContent: string): string {
  return stderrContent.trim() || 'Aleph pin failed without stderr output';
}

export function parseStoreMessageStatus(content: string): RootfsStoreMessageStatus {
  const payload = JSON.parse(content) as {
    status?: string;
    error_code?: number;
    details?: {
      errors?: Array<{ account_balance?: string | number; required_balance?: string | number }>;
      [key: string]: unknown;
    } | Record<string, unknown>;
  };
  const status = payload.status?.trim() ?? '';

  if (status !== 'rejected') {
    return { status };
  }

  const firstError = Array.isArray((payload.details as { errors?: unknown[] } | undefined)?.errors)
    ? (payload.details as { errors: Array<{ account_balance?: string | number; required_balance?: string | number }> }).errors[0]
    : undefined;

  if (
    payload.error_code === 5 &&
    firstError &&
    firstError.account_balance != null &&
    firstError.required_balance != null
  ) {
    return {
      status,
      rejectionSummary: `insufficient Aleph balance: account has ${firstError.account_balance}, required is ${firstError.required_balance}`,
    };
  }

  if (payload.error_code == null) {
    return {
      status,
      rejectionSummary: JSON.stringify(payload.details ?? {}),
    };
  }

  return {
    status,
    rejectionSummary: `error ${payload.error_code}: ${JSON.stringify(payload.details ?? {})}`,
  };
}

export function createRootfsPublicationResult(ipfsAddContent: string, storeMessageContent: string): RootfsPublicationResult {
  const entries = parseIpfsAddResponse(ipfsAddContent);
  const storeMessage = parseStoreMessageResponse(storeMessageContent);
  return {
    cid: extractRootfsCid(entries),
    itemHash: storeMessage.item_hash,
    sourceSizeBytes: extractRootfsSourceSizeBytes(entries),
  };
}
