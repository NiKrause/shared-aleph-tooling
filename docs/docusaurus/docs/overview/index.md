# Shared Aleph Tooling

`shared-aleph-tooling` provides reusable Aleph Cloud deployment tooling for
consumer projects that need to:

- build and publish RootFS images
- deploy Aleph VM instances
- publish static sites through Aleph/IPFS
- verify deployed relays and bootstrap addresses
- clean up older Aleph deployment records

This repo is the implementation layer behind Aleph deployment flows used by
consumer projects such as `universal-connectivity`.

## Package Naming

Packages use the `@le-space/*` scope.

For example:

- package: `@le-space/node`

## What Exists Today

The repository currently contains working Aleph-specific support for:

- shared manifest and runtime types
- RootFS planning and publish helpers
- Aleph `STORE`, `INSTANCE`, `AGGREGATE`, and `FORGET` flows
- CRN discovery, ranking, and retry selection
- deployment inspection and polling
- runtime inspection and readiness polling
- `uc-go-peer` guest configuration and verification
- Node-side Aleph runners used by GitHub Actions
- a shared `aleph-vm-deploy` GitHub Action

## What Is Still In Progress

Some parts are still intentionally incomplete:

- `@le-space/browser`
  now published and usable
  still evolving, but already owns shared browser/PWA deployment helpers
- the reusable workflow layer is still evolving
- some docs still describe current direction rather than final public API shape

## Repository Shape

- `packages/shared-types`
  package: `@le-space/shared-types`
  Shared contracts used across every package.
- `packages/core`
  package: `@le-space/core`
  Deployment, runtime, CRN, guest, and retention logic that should not depend
  on GitHub Actions, browsers, or Node-specific environment parsing.
- `packages/node`
  package: `@le-space/node`
  Node adapters and Aleph runner entrypoints for CI and automation.
- `packages/browser`
  package: `@le-space/browser`
  Browser-safe Aleph deployment helpers for PWAs and other browser clients.
  Current scope includes API polling, RootFS resolution, pricing, browser EVM
  helpers, and prepaid vault protocol helpers.
- `packages/rootfs`
  package: `@le-space/rootfs`
  RootFS planning, manifests, reference assets, and build helpers.
- `.github/actions/aleph-vm-deploy`
  Shared GitHub Action wrapper around the Node runner.
- `.github/workflows/aleph-rootfs-build-publish-deploy.yml`
  Shared Aleph workflow entrypoint.

## Examples And Real Integrations

The `examples/` directory is for thin reference skeletons and integration
shapes. It should not become a home for copied full applications.

Real integrations stay in their own repositories and are linked from docs as
canonical references.

Current real references include:

- `universal-connectivity`
  - especially the Aleph integration work in PR `#344`
- `aleph-libp2p-relay`
  - especially `relay-deployer-pwa` as the browser/PWA reference consumer

See also:

- [Examples And Real Integrations](../architecture/examples-and-integrations.md)

## Recommended Reading Order

1. [Package Boundaries](../architecture/package-boundaries.md)
2. [Examples And Real Integrations](../architecture/examples-and-integrations.md)
3. [Deployment Lifecycle](../architecture/deployment-lifecycle.md)
4. [GitHub Action Reference](../reference/github-action.md)
5. [Rootfs Contract Reference](../reference/rootfs-contract.md)
6. [Reusable Workflow Reference](../reference/reusable-workflow.md)
