import { field } from "@infinitecanvas/ecs";
import { defineEditorComponent } from "@infinitecanvas/ecs-sync";

/**
 * Upload state for assets.
 */
export const UploadState = {
  /** Asset queued for upload, not yet started */
  Pending: "pending",
  /** Upload in progress */
  Uploading: "uploading",
  /** Upload completed successfully */
  Complete: "complete",
  /** Upload failed */
  Failed: "failed",
} as const;

/**
 * Asset component - tracks upload state and identifier for binary assets.
 *
 * The identifier is empty until upload completes, at which point it contains
 * the permanent identifier returned by the AssetProvider.
 */
export const Asset = defineEditorComponent(
  { name: "asset", sync: "document", excludeFromHistory: ["uploadState"] },
  {
    /** Permanent identifier from AssetProvider (empty until upload complete) */
    identifier: field.string().max(512).default(""),
    /** Current upload state */
    uploadState: field.enum(UploadState).default(UploadState.Pending),
  },
);
