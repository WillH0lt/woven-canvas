import type { Adapter } from "../Adapter";
import type {
  Mutation,
  Patch,
  ComponentData,
  ClientMessage,
  ServerMessage,
} from "../types";
import { Origin } from "../constants";
import { merge } from "../mutations";

export interface WebsocketAdapterOptions {
  url: string;
  clientId: string;
}

/**
 * WebSocket adapter for real-time multiplayer sync.
 *
 * Sends local mutations to a server and receives remote mutations
 * from other clients. Echoed messages from the same clientId are
 * ignored to prevent circular updates.
 *
 * On reconnect, sends the last known timestamp so the server can
 * replay missed operations or respond with a full-sync.
 */
export class WebsocketAdapter implements Adapter {
  private url: string;
  private clientId: string;
  private ws: WebSocket | null = null;
  private pendingPatches: Patch[] = [];
  private lastTimestamp = 0;

  constructor(options: WebsocketAdapterOptions) {
    this.url = options.url;
    this.clientId = options.clientId;
  }

  async init(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const url = new URL(this.url);
      url.searchParams.set("clientId", this.clientId);
      const ws = new WebSocket(url.toString());

      ws.addEventListener("open", () => {
        this.ws = ws;
        resolve();
      });

      ws.addEventListener("error", () => {
        reject(new Error(`WebSocket failed to connect to ${this.url}`));
      });

      ws.addEventListener("message", (event) => {
        this.handleMessage(event.data as string);
      });

      ws.addEventListener("close", () => {
        this.ws = null;
      });
    });
  }

  push(mutations: Mutation[]): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const patches: Patch[] = [];
    for (const m of mutations) {
      if (m.origin !== Origin.Websocket) {
        patches.push(m.patch);
      }
    }

    if (patches.length === 0) return;
    const msg: ClientMessage = { type: "patch", patches };
    this.ws.send(JSON.stringify(msg));
  }

  pull(): Mutation | null {
    if (this.pendingPatches.length === 0) return null;
    const patch = merge(...this.pendingPatches);
    this.pendingPatches = [];
    return { patch, origin: Origin.Websocket };
  }

  close(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Attempt to reconnect, requesting missed ops since last timestamp.
   */
  async reconnect(): Promise<void> {
    await this.init();

    if (this.ws && this.lastTimestamp > 0) {
      const msg: ClientMessage = {
        type: "reconnect",
        lastTimestamp: this.lastTimestamp,
      };
      this.ws.send(JSON.stringify(msg));
    }
  }

  private handleMessage(data: string): void {
    let msg: ServerMessage;
    try {
      msg = JSON.parse(data) as ServerMessage;
    } catch {
      return;
    }

    switch (msg.type) {
      case "patch":
        this.lastTimestamp = msg.timestamp;
        // Ignore echoes of our own mutations
        if (msg.clientId === this.clientId) return;
        this.pendingPatches.push(...msg.patches);
        break;

      case "full-sync":
        this.lastTimestamp = msg.timestamp;
        this.applyFullSync(msg.state);
        break;
    }
  }

  private applyFullSync(state: Record<string, unknown>): void {
    const patch: Patch = {};
    for (const [key, value] of Object.entries(state)) {
      patch[key] = { _exists: true, ...(value as ComponentData) };
    }
    if (Object.keys(patch).length > 0) {
      this.pendingPatches.push(patch);
    }
  }
}
