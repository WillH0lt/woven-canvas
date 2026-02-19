# @woven-canvas/asset-sync

Asset management for local-first applications.

## Installation

```bash
npm install @woven-canvas/asset-sync
```

## Usage

```typescript
import { AssetManager, LocalAssetProvider } from "@woven-canvas/asset-sync";

// Create a local asset provider (stores in IndexedDB)
const provider = new LocalAssetProvider();

// Create the asset manager
const assetManager = new AssetManager({
  provider,
  documentId: "my-document-id",
});

// Initialize (opens IndexedDB stores)
await assetManager.init();

// Resume any pending uploads from previous sessions
await assetManager.resumePendingUploads();

// Upload an asset
const blob = new Blob(["..."], { type: "image/png" });
const identifier = crypto.randomUUID();
await assetManager.upload(identifier, blob, {
  filename: "image.png",
  mimeType: "image/png",
});

// Get display URL (returns blob URL for pending uploads, resolved URL otherwise)
const url = await assetManager.getDisplayUrl(identifier);
```

## Features

- **Local-First**: Assets stored locally in IndexedDB, synced to cloud when online
- **Upload Queueing**: Persistent upload queue with automatic retry and exponential backoff
- **Blob URLs**: Immediate display of pending uploads via blob URLs
- **Session Persistence**: Resume pending uploads across browser sessions
- **Pluggable Providers**: Implement custom storage backends

## API

### AssetManager

The main class for managing assets:

```typescript
interface AssetManagerOptions {
  provider: AssetProvider;
  documentId: string;
}

class AssetManager {
  constructor(options: AssetManagerOptions);

  // Initialize IndexedDB stores
  init(): Promise<void>;

  // Resume pending uploads from previous sessions
  resumePendingUploads(): Promise<void>;

  // Upload an asset (returns when upload completes)
  upload(identifier: string, blob: Blob, metadata?: AssetMetadata): Promise<void>;

  // Get URL for display (blob URL for pending, resolved URL otherwise)
  getDisplayUrl(identifier: string): Promise<string | null>;

  // Check upload status
  hasPendingUpload(identifier: string): boolean;
  isUploading(identifier: string): boolean;

  // Cancel a pending upload
  cancelUpload(identifier: string): Promise<void>;

  // Clean up resources
  close(): void;
}
```

### AssetProvider

Interface for implementing custom storage backends:

```typescript
interface AssetProvider {
  // Upload a blob to storage
  upload(blob: Blob, identifier: string, metadata?: AssetMetadata): Promise<AssetUploadResult>;

  // Resolve an identifier to a displayable URL
  resolveUrl(identifier: string): Promise<string>;

  // Optional: Delete an asset
  delete?(identifier: string): Promise<void>;

  // Configuration options
  maxRetries?: number; // Max upload retry attempts (default: 3)
  retryDelay?: number; // Retry delay in ms (default: 5000)
}

interface AssetMetadata {
  filename?: string;
  mimeType?: string;
}

interface AssetUploadResult {
  url?: string; // Optional immediate URL
}
```

### LocalAssetProvider

Built-in provider that stores assets in IndexedDB (suitable for local-only apps or demos):

```typescript
const provider = new LocalAssetProvider();

// Clean up when done
provider.close();
```

## Custom Provider Example

```typescript
const myProvider: AssetProvider = {
  async upload(blob, identifier, metadata) {
    const formData = new FormData();
    formData.append("file", blob, metadata?.filename);
    formData.append("id", identifier);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const { url } = await response.json();
    return { url };
  },

  async resolveUrl(identifier) {
    const response = await fetch(`/api/assets/${identifier}/url`);
    const { url } = await response.json();
    return url;
  },
};
```

## License

MIT
