import { keccak_256 } from "@noble/hashes/sha3";

import type { SponsorRelayWalletState } from "./types";

export interface EthereumProviderLike {
  isMetaMask?: boolean;
  request<T = unknown>(args: {
    method: string;
    params?: unknown[] | Record<string, unknown>;
  }): Promise<T>;
  on?(event: string, listener: (...args: unknown[]) => void): void;
  removeListener?(event: string, listener: (...args: unknown[]) => void): void;
}

export function getEthereumProvider(): EthereumProviderLike | null {
  return (
    (globalThis as { window?: { ethereum?: EthereumProviderLike } }).window
      ?.ethereum ?? null
  );
}

export function toChecksumAddress(address: string): string {
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    throw new Error("Invalid EVM address.");
  }

  const normalized = address.slice(2).toLowerCase();
  const hash = Array.from(keccak_256(new TextEncoder().encode(normalized)))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  let result = "0x";

  for (let index = 0; index < normalized.length; index += 1) {
    result +=
      Number.parseInt(hash[index], 16) >= 8
        ? normalized[index].toUpperCase()
        : normalized[index];
  }

  return result;
}

export async function connectWallet(
  provider = getEthereumProvider(),
): Promise<SponsorRelayWalletState> {
  if (!provider) {
    throw new Error("MetaMask provider not found.");
  }

  const accounts = await provider.request<string[]>({
    method: "eth_requestAccounts",
  });
  const chainId = await provider.request<string>({ method: "eth_chainId" });
  const address = accounts[0] ? toChecksumAddress(accounts[0]) : null;
  return {
    connected: Boolean(address),
    address,
    chainId,
    isMetaMask: Boolean(provider.isMetaMask),
  };
}

export async function personalSign(
  address: string,
  message: string,
  provider = getEthereumProvider(),
): Promise<string> {
  if (!provider) {
    throw new Error("MetaMask provider not found.");
  }

  const payload = `0x${Array.from(new TextEncoder().encode(message))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")}`;

  return provider.request<string>({
    method: "personal_sign",
    params: [payload, address],
  });
}

export function watchWallet(
  onChange: () => void,
  provider = getEthereumProvider(),
): () => void {
  if (!provider?.on || !provider?.removeListener) {
    return () => {};
  }

  provider.on("accountsChanged", onChange);
  provider.on("chainChanged", onChange);

  return () => {
    provider.removeListener?.("accountsChanged", onChange);
    provider.removeListener?.("chainChanged", onChange);
  };
}
