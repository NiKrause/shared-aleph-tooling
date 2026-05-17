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

Workspace package names use the `@shared-aleph/*` scope.

Published consumer packages are currently released under the `@le-space/*`
scope.

For example:

- workspace package: `@shared-aleph/node`
- published consumer package: `@le-space/node`

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

- workspace: `@shared-aleph/browser`
  published: not released yet
  future-facing
- the reusable workflow layer is still evolving
- some docs still describe current direction rather than final public API shape

## Repository Shape

- `packages/shared-types`
  workspace: `@shared-aleph/shared-types`
  published: `@le-space/shared-types`
  Shared contracts used across every package.
- `packages/core`
  workspace: `@shared-aleph/core`
  published: `@le-space/core`
  Deployment, runtime, CRN, guest, and retention logic that should not depend
  on GitHub Actions, browsers, or Node-specific environment parsing.
- `packages/node`
  workspace: `@shared-aleph/node`
  published: `@le-space/node`
  Node adapters and Aleph runner entrypoints for CI and automation.
- `packages/browser`
  workspace: `@shared-aleph/browser`
  published: not released yet
  Reserved for browser and wallet-driven Aleph flows.
- `packages/rootfs`
  workspace: `@shared-aleph/rootfs`
  published: `@le-space/rootfs`
  RootFS planning, manifests, reference assets, and build helpers.
- `.github/actions/aleph-vm-deploy`
  Shared GitHub Action wrapper around the Node runner.
- `.github/workflows/aleph-rootfs-build-publish-deploy.yml`
  Shared Aleph workflow entrypoint.

## Recommended Reading Order

1. [Package Boundaries](../architecture/package-boundaries.md)
2. [Deployment Lifecycle](../architecture/deployment-lifecycle.md)
3. [GitHub Action Reference](../reference/github-action.md)
4. [Rootfs Contract Reference](../reference/rootfs-contract.md)
5. [Reusable Workflow Reference](../reference/reusable-workflow.md)
