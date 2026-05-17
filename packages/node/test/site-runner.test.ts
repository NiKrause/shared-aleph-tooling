import test from "node:test"
import assert from "node:assert/strict"
import { chmod, mkdtemp, readFile, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { parseLastJsonObject, runBootstrapEnvMode, runDomainLinkMode, runProbeMode } from "../src/site-runner.ts"

async function createOutputEnv(prefix: string) {
  const dir = await mkdtemp(join(tmpdir(), prefix))
  const outputFile = join(dir, 'output.txt')
  const summaryFile = join(dir, 'summary.txt')
  return { dir, outputFile, summaryFile }
}

test('runBootstrapEnvMode emits browser bootstrap outputs', async () => {
  const { outputFile, summaryFile } = await createOutputEnv('site-bootstrap-')
  await runBootstrapEnvMode({
    GITHUB_OUTPUT: outputFile,
    GITHUB_STEP_SUMMARY: summaryFile,
    BROWSER_BOOTSTRAP_MULTIADDRS_JSON: JSON.stringify(['/dns4/example.com/tcp/443/tls/ws/p2p/abc', ' /dns4/example.org/tcp/443/tls/ws/p2p/def ']),
  })

  const outputs = await readFile(outputFile, 'utf8')
  assert.match(outputs, /available=true/)
  assert.match(outputs, /count=2/)
  assert.match(outputs, /csv=\/dns4\/example.com\/tcp\/443\/tls\/ws\/p2p\/abc,\/dns4\/example.org\/tcp\/443\/tls\/ws\/p2p\/def/)
  assert.match(outputs, /json=\["\/dns4\/example.com/)
})

test('runProbeMode merges unique probe addresses and emits outputs', async () => {
  const { dir, outputFile, summaryFile } = await createOutputEnv('site-probe-')
  const scriptPath = join(dir, 'probe.mjs')
  await writeFile(scriptPath, [
    "const addrs = process.argv.slice(2)",
    "for (const addr of addrs) {",
    "  process.stdout.write(JSON.stringify({ address: addr, ok: true, protocols: [], dialMs: 1, pingMs: 1, remoteAddrs: [], error: null }) + '\\n')",
    "}",
    "",
  ].join('\n'))

  await runProbeMode({
    GITHUB_OUTPUT: outputFile,
    GITHUB_STEP_SUMMARY: summaryFile,
    ALEPH_SITE_PROBE_WORKDIR: dir,
    ALEPH_SITE_PROBE_SCRIPT: scriptPath,
    PROBE_MULTIADDRS_JSON: JSON.stringify(['/ip4/1.1.1.1/tcp/1234/p2p/peer', '/ip4/1.1.1.1/tcp/1234/p2p/peer']),
    BROWSER_BOOTSTRAP_MULTIADDRS_JSON: JSON.stringify(['/dns4/example.com/tcp/443/tls/ws/p2p/peer']),
  })

  const outputs = await readFile(outputFile, 'utf8')
  assert.match(outputs, /ok=true/)
  assert.match(outputs, /merged_multiaddrs_json=/)
  assert.match(outputs, /dns4\/example.com/)
})

test('runDomainLinkMode detaches and attaches the production domain', async () => {
  const { dir, outputFile, summaryFile } = await createOutputEnv('site-domain-')
  const fakeAleph = join(dir, 'aleph')
  const commandLog = join(dir, 'commands.log')
  await writeFile(fakeAleph, [
    '#!/bin/sh',
    'printf "%s\\n" "$*" >> "' + commandLog + '"',
    'exit 0',
    '',
  ].join('\n'))
  await chmod(fakeAleph, 0o755)

  await runDomainLinkMode({
    GITHUB_OUTPUT: outputFile,
    GITHUB_STEP_SUMMARY: summaryFile,
    ALEPH_SITE_PROJECT_DIR: dir,
    ALEPH_SITE_ALEPH_BIN: fakeAleph,
    ALEPH_SITE_DOMAIN: 'relay.example.com',
    ALEPH_SITE_ITEM_HASH: 'abcd1234',
  })

  const outputs = await readFile(outputFile, 'utf8')
  const commands = await readFile(commandLog, 'utf8')
  assert.match(outputs, /domain=relay.example.com/)
  assert.match(outputs, /item_hash=abcd1234/)
  assert.match(outputs, /url=https:\/\/relay.example.com/)
  assert.match(commands, /domain detach relay.example.com --no-ask/)
  assert.match(commands, /domain attach relay.example.com --item-hash abcd1234 --catch-all-path \/index.html --no-ask/)
})

test('parseLastJsonObject parses multiline trailing JSON output', () => {
  const payload = parseLastJsonObject('prefix\n{\n  "item_hash": "abc123",\n  "content": {\n    "item_hash": "QmExample"\n  }\n}')
  assert.equal(payload.item_hash, 'abc123')
})
