import test from 'node:test'
import assert from 'node:assert/strict'

import {
  enrichCrnsWithGeo,
  fetchCrns,
  filterDeployableCrns,
  listGeocodedCrns,
  rankCandidateCrns,
  selectPreferredCrn
} from '../src/crns.ts'

function jsonResponse(payload: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return payload
    }
  }
}

test('fetchCrns reads the active CRN list payload', async () => {
  const result = await fetchCrns({
    url: 'https://crns-list.aleph.sh/crns.json',
    fetch: async (url) => {
      assert.match(String(url), /filter_inactive=true/)
      return jsonResponse({
        crns: [{ hash: 'crn-1', name: 'One' }]
      })
    }
  })

  assert.deepEqual(result, [{ hash: 'crn-1', name: 'One' }])
})

test('enrichCrnsWithGeo preserves already geocoded CRNs and enriches unresolved hosts', async () => {
  const fetchCalls: string[] = []
  const result = await enrichCrnsWithGeo(
    [
      { hash: 'crn-1', address: 'https://alpha.example.com', score: 10 },
      { hash: 'crn-2', address: 'https://beta.example.com', city: 'Berlin', country_code: 'DE' }
    ],
    {
      fetch: async (url) => {
        fetchCalls.push(String(url))
        if (String(url).includes('dns.google/resolve')) {
          return jsonResponse({ Answer: [{ data: '203.0.113.5' }] })
        }
        if (String(url).includes('api.country.is')) {
          return jsonResponse({
            ip: '203.0.113.5',
            city: 'Hamburg',
            subdivision: 'Hamburg',
            country: 'DE'
          })
        }
        throw new Error(`Unexpected URL ${String(url)}`)
      }
    }
  )

  assert.equal(result[0].city, 'Hamburg')
  assert.equal(result[0].country_code, 'DE')
  assert.equal(result[1].city, 'Berlin')
  assert.equal(fetchCalls.filter((entry) => entry.includes('dns.google/resolve')).length, 1)
})

test('listGeocodedCrns returns only compatible geocoded entries', async () => {
  const result = await listGeocodedCrns({
    url: 'https://crns-list.aleph.sh/crns.json',
    limit: 5,
    fetch: async (url) => {
      if (String(url).includes('crns-list.aleph.sh')) {
        return jsonResponse({
          crns: [
            { hash: 'inactive', name: 'Inactive', system_usage: { active: false } },
            { hash: 'nogeo', name: 'NoGeo', address: 'https://nogeo.example.com', score: 5 },
            { hash: 'geoa', name: 'GeoA', address: 'https://a.example.com', score: 10 },
            { hash: 'geob', name: 'GeoB', city: 'Berlin', region: 'Berlin', country: 'Germany', country_code: 'DE', score: 9 }
          ]
        })
      }
      if (String(url).includes('dns.google/resolve') && String(url).includes('a.example.com')) {
        return jsonResponse({ Answer: [{ data: '203.0.113.9' }] })
      }
      if (String(url).includes('dns.google/resolve') && String(url).includes('nogeo.example.com')) {
        return jsonResponse({}, 404)
      }
      if (String(url).includes('api.country.is')) {
        return jsonResponse({
          ip: '203.0.113.9',
          city: 'Aachen',
          subdivision: 'North Rhine-Westphalia',
          country: 'DE'
        })
      }
      throw new Error(`Unexpected URL ${String(url)}`)
    }
  })

  assert.deepEqual(
    result.map((entry) => entry.hash),
    ['geob', 'geoa']
  )
})

test('filterDeployableCrns keeps only active qemu-capable CRNs with enough capacity and sorts by score', () => {
  const result = filterDeployableCrns(
    [
      { hash: 'inactive', name: 'Inactive', score: 99, system_usage: { active: false } },
      { hash: 'no-qemu', name: 'No QEMU', score: 95, qemu_support: false },
      {
        hash: 'too-small',
        name: 'Too Small',
        score: 90,
        system_usage: {
          active: true,
          cpu: { count: 1 },
          mem: { available_kB: 1024 },
          disk: { available_kB: 1024 }
        }
      },
      {
        hash: 'fit-high',
        name: 'Fit High',
        score: 92.1,
        system_usage: {
          active: true,
          cpu: { count: 4 },
          mem: { available_kB: 16 * 1024 * 1024 },
          disk: { available_kB: 200 * 1024 * 1024 }
        }
      },
      {
        hash: 'fit-low',
        name: 'Fit Low',
        score: 71.5,
        system_usage: {
          active: true,
          cpu: { count: 2 },
          mem: { available_kB: 8 * 1024 * 1024 },
          disk: { available_kB: 100 * 1024 * 1024 }
        }
      }
    ],
    {
      spec: {
        vcpus: 2,
        memoryMiB: 2048,
        diskMiB: 20480
      }
    }
  )

  assert.deepEqual(result.map((entry) => entry.name), ['Fit High', 'Fit Low'])
})

test('rankCandidateCrns prioritizes the preferred country while preserving score order otherwise', async () => {
  const ranked = await rankCandidateCrns(
    [
      { hash: 'us-best', name: 'US Best', country_code: 'US', score: 100 },
      { hash: 'de-mid', name: 'DE Mid', address: 'https://de.example.com', score: 90 },
      { hash: 'us-low', name: 'US Low', country_code: 'US', score: 80 }
    ],
    {
      preferredCountryCode: 'DE',
      geoLimit: 2,
      fetch: async (url) => {
        if (String(url).includes('dns.google/resolve')) {
          return jsonResponse({ Answer: [{ data: '198.51.100.8' }] })
        }
        if (String(url).includes('api.country.is')) {
          return jsonResponse({
            ip: '198.51.100.8',
            city: 'Berlin',
            subdivision: 'Berlin',
            country: 'DE'
          })
        }
        throw new Error(`Unexpected URL ${String(url)}`)
      }
    }
  )

  assert.deepEqual(ranked.map((entry) => entry.hash), ['de-mid', 'us-best', 'us-low'])
})

test('selectPreferredCrn returns the best ranked CRN or null', async () => {
  const selected = await selectPreferredCrn(
    [
      { hash: 'crn-1', country_code: 'US', score: 5 },
      { hash: 'crn-2', country_code: 'DE', score: 4 }
    ],
    {
      preferredCountryCode: 'DE',
      fetch: async () => jsonResponse({})
    }
  )

  assert.equal(selected?.hash, 'crn-2')
  assert.equal(
    await selectPreferredCrn([], {
      preferredCountryCode: 'DE',
      fetch: async () => jsonResponse({})
    }),
    null
  )
})
