import type { RootfsBuildPlan } from "./build-plan.ts";
import { createRootfsManifest, resolveRootfsManifestOutputPaths, serializeRootfsManifest, type RootfsManifest, type RootfsManifestOptions, type RootfsManifestOutputPaths } from "./manifest.ts";
import { publicationArtifacts, createRootfsPublicationResult, type RootfsPublicationArtifacts, type RootfsPublicationResult } from "./publication.ts";
import { createDockerRootfsExecutionPlan, createHostRootfsExecutionPlan, selectRootfsExecutionPlan, type RootfsExecutionPlan, type RootfsExecutionPlanOptions, type RootfsToolchainAvailability } from "./execution-plan.ts";

export interface RootfsBuildPipeline {
  buildPlan: RootfsBuildPlan;
  executionPlan: RootfsExecutionPlan;
  publicationArtifacts: RootfsPublicationArtifacts;
  manifestPaths: RootfsManifestOutputPaths;
}

export interface RootfsFinalizeResult {
  manifest: RootfsManifest;
  manifestJson: string;
  manifestPaths: RootfsManifestOutputPaths;
  publication?: RootfsPublicationResult;
}

export interface RootfsFinalizeOptions extends RootfsManifestOptions {
  ipfsAddResponseContent?: string;
  storeMessageContent?: string;
}

export function createRootfsBuildPipeline(
  buildPlan: RootfsBuildPlan,
  availability: RootfsToolchainAvailability,
  options: RootfsExecutionPlanOptions = {},
): RootfsBuildPipeline {
  return {
    buildPlan,
    executionPlan: selectRootfsExecutionPlan(buildPlan, availability, options),
    publicationArtifacts: publicationArtifacts(buildPlan),
    manifestPaths: resolveRootfsManifestOutputPaths(buildPlan),
  };
}

export function createHostRootfsBuildPipeline(
  buildPlan: RootfsBuildPlan,
  options: RootfsExecutionPlanOptions = {},
): RootfsBuildPipeline {
  return {
    buildPlan,
    executionPlan: createHostRootfsExecutionPlan(buildPlan, options),
    publicationArtifacts: publicationArtifacts(buildPlan),
    manifestPaths: resolveRootfsManifestOutputPaths(buildPlan),
  };
}

export function createDockerRootfsBuildPipeline(
  buildPlan: RootfsBuildPlan,
  options: RootfsExecutionPlanOptions = {},
): RootfsBuildPipeline {
  return {
    buildPlan,
    executionPlan: createDockerRootfsExecutionPlan(buildPlan, options),
    publicationArtifacts: publicationArtifacts(buildPlan),
    manifestPaths: resolveRootfsManifestOutputPaths(buildPlan),
  };
}

export function finalizeRootfsBuildPipeline(
  buildPlan: RootfsBuildPlan,
  options: RootfsFinalizeOptions = {},
): RootfsFinalizeResult {
  let publication: RootfsPublicationResult | undefined;
  if (options.ipfsAddResponseContent && options.storeMessageContent) {
    publication = createRootfsPublicationResult(options.ipfsAddResponseContent, options.storeMessageContent);
  }

  const manifest = createRootfsManifest(buildPlan, buildPlan.contract, {
    createdAt: options.createdAt,
    rootfsCid: publication?.cid ?? options.rootfsCid,
    rootfsItemHash: publication?.itemHash ?? options.rootfsItemHash,
    rootfsSourceSizeBytes: publication?.sourceSizeBytes ?? options.rootfsSourceSizeBytes,
  });

  return {
    manifest,
    manifestJson: serializeRootfsManifest(manifest),
    manifestPaths: resolveRootfsManifestOutputPaths(buildPlan),
    publication,
  };
}
