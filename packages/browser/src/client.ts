import {
  broadcastAlephMessage,
  broadcastInstanceMessage,
  configureOrbitdbRelaySetup,
  DEFAULT_ALEPH_API_HOST,
  DEFAULT_2N6_API_HOST,
  DEFAULT_CRN_LIST_URL,
  DEFAULT_ALEPH_SCHEDULER_API_HOST,
  fetchBalance,
  fetch2n6WebAccessUrl,
  fetchCrns,
  fetchInstances,
  fetchMessageEnvelope,
  fetchSchedulerAllocation,
  notifyCrnAllocation,
  inspectDeploymentResult,
  waitForDeploymentResult
} from './aleph-api'
import type { AlephBrowserClient } from './types'

export interface CreateAlephBrowserClientOptions {
  apiHost?: string
  crnListUrl?: string
  schedulerApiHost?: string
  twoN6ApiHost?: string
}

export function createAlephBrowserClient(options: CreateAlephBrowserClientOptions = {}): AlephBrowserClient {
  const apiHost = options.apiHost ?? DEFAULT_ALEPH_API_HOST
  const crnListUrl = options.crnListUrl ?? DEFAULT_CRN_LIST_URL
  const schedulerApiHost = options.schedulerApiHost ?? DEFAULT_ALEPH_SCHEDULER_API_HOST
  const twoN6ApiHost = options.twoN6ApiHost ?? DEFAULT_2N6_API_HOST

  return {
    apiHost,
    crnListUrl,
    schedulerApiHost,
    fetchBalance(address) {
      return fetchBalance(address, apiHost)
    },
    fetchCrns() {
      return fetchCrns(crnListUrl)
    },
    fetchInstances(address) {
      return fetchInstances(address, apiHost)
    },
    fetch2n6WebAccessUrl(itemHash) {
      return fetch2n6WebAccessUrl(itemHash, twoN6ApiHost)
    },
    fetchMessageEnvelope(itemHash) {
      return fetchMessageEnvelope(itemHash, apiHost)
    },
    fetchSchedulerAllocation(itemHash) {
      return fetchSchedulerAllocation(itemHash, schedulerApiHost)
    },
    notifyCrnAllocation(crnUrl, itemHash) {
      return notifyCrnAllocation(crnUrl, itemHash)
    },
    configureOrbitdbRelaySetup(args) {
      return configureOrbitdbRelaySetup(args)
    },
    inspectDeploymentResult(itemHash, rootfsRef) {
      return inspectDeploymentResult(itemHash, rootfsRef, apiHost)
    },
    waitForDeploymentResult(itemHash, rootfsRef, attempts, delayMs) {
      return waitForDeploymentResult(itemHash, rootfsRef, apiHost, attempts, delayMs)
    },
    broadcastInstanceMessage(message, sync) {
      return broadcastInstanceMessage(message, apiHost, sync)
    },
    broadcastAlephMessage(message, sync) {
      return broadcastAlephMessage(message, apiHost, sync)
    }
  }
}
