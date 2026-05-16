import test from "node:test";
import assert from "node:assert/strict";

import {
  createRootfsBuildPlan,
  createRootfsPublicationResult,
  extractRootfsCid,
  extractRootfsSourceSizeBytes,
  parseIpfsAddResponse,
  parseStoreMessageResponse,
  parseStoreMessageStatus,
  publicationArtifacts,
  readRootfsContractFile,
  referenceProfileContractPath,
  summarizeStoreMessageFailure,
} from "../src/index.ts";

async function loadPlan() {
  const contract = await readRootfsContractFile(referenceProfileContractPath('uc-go-peer'));
  return createRootfsBuildPlan(contract, {
    projectDir: '/workspace/universal-connectivity',
    rootfsVersion: 'uc-go-peer-git-20260516-deadbee',
  });
}

test('publicationArtifacts matches the UC rootfs output file layout', async () => {
  const plan = await loadPlan();
  assert.deepEqual(publicationArtifacts(plan), {
    ipfsAddResponsePath: '/workspace/universal-connectivity/go-peer/aleph/dist-rootfs/ipfs-add-response.jsonl',
    storeMessagePath: '/workspace/universal-connectivity/go-peer/aleph/dist-rootfs/store-message.json',
    storeMessageStderrPath: '/workspace/universal-connectivity/go-peer/aleph/dist-rootfs/store-message.stderr.log',
  });
});

test('parseIpfsAddResponse and helpers extract CID and size from the last line', () => {
  const entries = parseIpfsAddResponse([
    '{"Name":"part-1","Hash":"bafychunk","Size":"1024"}',
    '{"Name":"aleph-uc-go-peer.qcow2","Hash":"bafyrootfs","Size":"987654321"}',
  ].join('\n'));

  assert.equal(extractRootfsCid(entries), 'bafyrootfs');
  assert.equal(extractRootfsSourceSizeBytes(entries), 987654321);
});

test('parseStoreMessageResponse extracts the Aleph item hash', () => {
  assert.deepEqual(parseStoreMessageResponse('{"item_hash":"abc123"}'), {
    item_hash: 'abc123',
  });
});

test('parseStoreMessageStatus summarizes insufficient-balance rejection like the UC builder', () => {
  const status = parseStoreMessageStatus(JSON.stringify({
    status: 'rejected',
    error_code: 5,
    details: {
      errors: [
        {
          account_balance: '1.2',
          required_balance: '3.4',
        },
      ],
    },
  }));

  assert.deepEqual(status, {
    status: 'rejected',
    rejectionSummary: 'insufficient Aleph balance: account has 1.2, required is 3.4',
  });
});

test('summarizeStoreMessageFailure falls back to a helpful default', () => {
  assert.equal(summarizeStoreMessageFailure('  \n  '), 'Aleph pin failed without stderr output');
});

test('createRootfsPublicationResult normalizes the shared publish result shape', () => {
  assert.deepEqual(
    createRootfsPublicationResult(
      [
        '{"Name":"part-1","Hash":"bafychunk","Size":"1024"}',
        '{"Name":"aleph-uc-go-peer.qcow2","Hash":"bafyrootfs","Size":"987654321"}',
      ].join('\n'),
      '{"item_hash":"store-item-hash"}',
    ),
    {
      cid: 'bafyrootfs',
      itemHash: 'store-item-hash',
      sourceSizeBytes: 987654321,
    },
  );
});
