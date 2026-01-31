import type { Adapter } from "../Adapter";
import type { Mutation, Patch, ClientMessage, ServerMessage } from "../types";
import { Origin } from "../constants";
import { merge, strip } from "../mutations";
import { openStore, type KeyValueStore } from "../storage";

/** Send interval when multiple clients are connected (~30 fps). */
const MULTI_CLIENT_INTERVAL = 1000 / 30;
/** Send interval when editing solo (~1 fps). */
const SOLO_INTERVAL = 1000;

export interface WebsocketAdapterOptions {
  url: string;
  clientId: string;
  documentId: string;
  usePersistence: boolean;
  startOffline?: boolean;
}

/**
 * WebSocket adapter for real-time multiplayer sync.
 *
 * Sends local mutations to a server and receives remote mutations
 * from other clients. The server acknowledges our patches with an
 * ack (containing the assigned timestamp) and broadcasts them to
 * other clients separately.
 *
 * On reconnect, sends the last known timestamp so the server can
 * send a patch with missed operations.
 *
 * When `usePersistence` is true, the offline buffer and lastTimestamp
 * are persisted to IndexedDB so they survive page reloads.
 */
export class WebsocketAdapter implements Adapter {
  private url: string;
  private clientId: string;
  private ws: WebSocket | null = null;
  private pendingPatches: Patch[] = [];
  private lastTimestamp = 0;
  private messageCounter = 0;
  /** Patches sent but not yet acknowledged, keyed by messageId. */
  private inFlight = new Map<string, Patch>();

  private startOffline: boolean;
  private usePersistence: boolean;
  private documentId: string;
  private store: KeyValueStore | null = null;

  /** Patches accumulated while disconnected, merged into one. */
  private offlineBuffer: Patch = {};
  /** Number of clients currently connected to the server. */
  private connectedUsers = 0;
  /** True when the user intentionally disconnected (no auto-reconnect). */
  private intentionallyClosed = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 500;
  private static readonly MIN_RECONNECT_DELAY = 500;
  private static readonly MAX_RECONNECT_DELAY = 10_000;

  /** Patches buffered between sends for throttling. */
  private sendBuffer: Patch[] = [];
  /** Timestamp of the last flush (ms). */
  private lastSendTime = 0;

  constructor(options: WebsocketAdapterOptions) {
    this.url = options.url;
    this.clientId = options.clientId;
    this.startOffline = options.startOffline ?? false;
    this.usePersistence = options.usePersistence;
    this.documentId = options.documentId;
  }

  async init(): Promise<void> {
    if (this.usePersistence) {
      try {
        this.store = await openStore(`${this.documentId}-ws`, "meta");
        const savedBuffer = await this.store.get<Patch>("offlineBuffer");
        const savedTimestamp = await this.store.get<number>("lastTimestamp");
        if (savedBuffer) this.offlineBuffer = savedBuffer;
        if (savedTimestamp) this.lastTimestamp = savedTimestamp;
      } catch (err) {
        console.error("Failed to load websocket offline state:", err);
      }
    }

    if (this.startOffline) {
      this.intentionallyClosed = true;
      return;
    }
    this.intentionallyClosed = false;
    return this.connectWs();
  }

  private connectWs(): Promise<void> {
    this.inFlight.clear();
    return new Promise<void>((resolve, reject) => {
      const url = new URL(this.url);
      url.searchParams.set("clientId", this.clientId);
      const ws = new WebSocket(url.toString());

      ws.addEventListener("open", () => {
        this.ws = ws;
        // Request missed ops since last sync
        const msg: ClientMessage = {
          type: "reconnect",
          lastTimestamp: this.lastTimestamp,
          patches: [],
        };

        if (Object.keys(this.offlineBuffer).length > 0) {
          msg.patches = [this.offlineBuffer];
        }

        ws.send(JSON.stringify(msg));
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
        if (!this.intentionallyClosed) {
          this.scheduleReconnect();
        }
      });
    });
  }

  push(mutations: Mutation[]): void {
    const patches: Patch[] = [];
    for (const m of mutations) {
      if (m.origin === Origin.Websocket) continue;
      if (m.origin === Origin.Persistence) continue;
      patches.push(m.patch);
    }

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      // Buffer while offline
      if (patches.length > 0) {
        this.offlineBuffer = merge(this.offlineBuffer, ...patches);
        this.persistOfflineBuffer();
      }
      return;
    }

    if (patches.length > 0) {
      this.sendBuffer.push(...patches);
    }

    this.flushIfReady();
  }

  /** Target send interval based on current client count. */
  private get sendInterval(): number {
    return this.connectedUsers > 1 ? MULTI_CLIENT_INTERVAL : SOLO_INTERVAL;
  }

  /** Flush the send buffer if enough time has elapsed since the last send. */
  private flushIfReady(): void {
    const elapsed = performance.now() - this.lastSendTime;
    if (elapsed >= this.sendInterval) {
      this.flush();
    }
  }

  /** Send all buffered patches to the server. */
  private flush(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const patches: Patch[] = [];

    if (Object.keys(this.offlineBuffer).length > 0) {
      patches.push(this.offlineBuffer);
      this.offlineBuffer = {};
    }

    patches.push(...this.sendBuffer);
    this.sendBuffer = [];

    if (patches.length === 0) return;

    const messageId = `${this.clientId}-${++this.messageCounter}`;
    this.inFlight.set(messageId, merge(...patches));
    const msg: ClientMessage = { type: "patch", messageId, patches };
    this.ws.send(JSON.stringify(msg));
    this.lastSendTime = performance.now();
  }

  pull(): Mutation | null {
    if (this.pendingPatches.length === 0) return null;

    const serverPatch = merge(...this.pendingPatches);
    this.pendingPatches = [];

    if (Object.keys(this.offlineBuffer).length === 0) {
      return { patch: serverPatch, origin: Origin.Websocket };
    }

    // Strip buffer fields from server response (ECS already has them —
    // either from Persistence on page load or from the current session).
    // The buffer itself was already sent to the server in the reconnect message.
    // Deletions in serverPatch pass through strip() automatically.
    const diff = strip(serverPatch, this.offlineBuffer);
    this.clearPersistedOfflineBuffer();
    if (Object.keys(diff).length === 0) return null;
    return { patch: diff, origin: Origin.Websocket };
  }

  disconnect(): void {
    this.intentionallyClosed = true;
    this.clearReconnectTimer();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  close(): void {
    this.disconnect();
    if (this.store) {
      this.store.close();
      this.store = null;
    }
  }

  /**
   * Attempt to reconnect, requesting missed ops since last timestamp.
   */
  async reconnect(): Promise<void> {
    this.intentionallyClosed = false;
    this.reconnectDelay = WebsocketAdapter.MIN_RECONNECT_DELAY;
    this.clearReconnectTimer();
    await this.connectWs();
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private scheduleReconnect(): void {
    this.clearReconnectTimer();
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      try {
        await this.connectWs();
        // Success — reset delay (reconnect message sent inside connectWs)
        this.reconnectDelay = WebsocketAdapter.MIN_RECONNECT_DELAY;
      } catch {
        // Connection failed — back off and retry (close handler will fire)
        this.reconnectDelay = Math.min(
          this.reconnectDelay * 2,
          WebsocketAdapter.MAX_RECONNECT_DELAY,
        );
        this.scheduleReconnect();
      }
    }, this.reconnectDelay);
  }

  private handleMessage(data: string): void {
    let msg: ServerMessage;
    try {
      msg = JSON.parse(data) as ServerMessage;
    } catch {
      return;
    }

    switch (msg.type) {
      case "patch": {
        this.lastTimestamp = msg.timestamp;
        this.persistTimestamp();
        const filtered = this.stripInFlightFields(msg.patches);
        this.pendingPatches.push(...filtered);
        break;
      }

      case "ack":
        this.lastTimestamp = msg.timestamp;
        this.persistTimestamp();
        this.inFlight.delete(msg.messageId);
        break;

      case "clientCount":
        this.connectedUsers = msg.count;
        break;
    }
  }

  /**
   * Strip fields from incoming patches that overlap with in-flight
   * patches. Broadcasts that arrive before our ack were processed
   * before our patch on the server — our patch overwrites them, so
   * applying them locally would cause divergence. TCP ordering
   * guarantees broadcasts processed after ours arrive after the ack,
   * when inFlight is already cleared.
   */
  private stripInFlightFields(patches: Patch[]): Patch[] {
    if (this.inFlight.size === 0) return patches;

    const mask = merge(...Array.from(this.inFlight.values()));
    const result: Patch[] = [];

    for (const patch of patches) {
      const filtered = strip(patch, mask);
      if (Object.keys(filtered).length > 0) {
        result.push(filtered);
      }
    }

    return result;
  }

  // --- Persistence helpers ---

  private persistOfflineBuffer(): void {
    if (!this.store || !this.usePersistence) return;
    this.store.put("offlineBuffer", this.offlineBuffer);
  }

  private persistTimestamp(): void {
    if (!this.store || !this.usePersistence) return;
    this.store.put("lastTimestamp", this.lastTimestamp);
  }

  private clearPersistedOfflineBuffer(): void {
    this.offlineBuffer = {};
    if (!this.store || !this.usePersistence) return;
    this.store.delete("offlineBuffer");
  }
}
