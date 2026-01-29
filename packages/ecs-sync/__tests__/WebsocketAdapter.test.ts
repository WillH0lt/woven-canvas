import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { WebsocketAdapter } from "../src/adapters/Websocket";
import { Origin } from "../src/constants";
import type { Mutation, ServerMessage } from "../src/types";

// Mock WebSocket
class MockWebSocket {
  static OPEN = 1;
  static CLOSED = 3;

  url: string;
  readyState = MockWebSocket.OPEN;
  private listeners: Record<string, Array<(event: any) => void>> = {};
  sentMessages: string[] = [];

  constructor(url: string) {
    this.url = url;
    // Auto-fire open event on next microtask
    queueMicrotask(() => {
      this.dispatchEvent("open", {});
    });
  }

  addEventListener(type: string, listener: (event: any) => void) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type]!.push(listener);
  }

  send(data: string) {
    this.sentMessages.push(data);
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    this.dispatchEvent("close", {});
  }

  dispatchEvent(type: string, event: any) {
    for (const listener of this.listeners[type] ?? []) {
      listener(event);
    }
  }

  // Test helper: simulate receiving a server message
  receiveMessage(msg: ServerMessage) {
    this.dispatchEvent("message", { data: JSON.stringify(msg) });
  }
}

describe("WebsocketAdapter", () => {
  let mockWs: MockWebSocket;

  beforeEach(() => {
    // Replace global WebSocket with a mock class
    const MockWSClass = class extends MockWebSocket {
      constructor(url: string) {
        super(url);
        mockWs = this;
      }
    };
    // Copy static properties
    (MockWSClass as any).OPEN = MockWebSocket.OPEN;
    (MockWSClass as any).CLOSED = MockWebSocket.CLOSED;
    vi.stubGlobal("WebSocket", MockWSClass);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function createAdapter(clientId = "client-1") {
    return new WebsocketAdapter({
      url: "ws://localhost:8080",
      clientId,
    });
  }

  describe("init", () => {
    it("creates a WebSocket connection", async () => {
      const adapter = createAdapter();
      await adapter.init();
      expect(mockWs).toBeDefined();
      expect(mockWs.url).toBe("ws://localhost:8080");
    });

    it("rejects on connection error", async () => {
      // Replace with a mock that fires error instead of open
      const ErrorMockWS = class {
        static OPEN = 1;
        static CLOSED = 3;
        private listeners: Record<string, Array<(event: any) => void>> = {};

        constructor(_url: string) {
          queueMicrotask(() => {
            for (const listener of this.listeners["error"] ?? []) {
              listener({});
            }
          });
        }

        addEventListener(type: string, listener: (event: any) => void) {
          if (!this.listeners[type]) this.listeners[type] = [];
          this.listeners[type]!.push(listener);
        }
      };
      vi.stubGlobal("WebSocket", ErrorMockWS);

      const adapter = createAdapter();
      await expect(adapter.init()).rejects.toThrow("WebSocket failed to connect");
    });
  });

  describe("push", () => {
    it("sends patches as JSON", async () => {
      const adapter = createAdapter();
      await adapter.init();

      const mutations: Mutation[] = [
        { patch: { "e1/Pos": { x: 10 } }, origin: Origin.ECS },
      ];
      adapter.push(mutations);

      expect(mockWs.sentMessages).toHaveLength(1);
      const sent = JSON.parse(mockWs.sentMessages[0]!);
      expect(sent).toEqual({
        type: "patch",
        patches: [{ "e1/Pos": { x: 10 } }],
      });
    });

    it("does nothing when WebSocket is not open", async () => {
      const adapter = createAdapter();
      await adapter.init();
      mockWs.readyState = MockWebSocket.CLOSED;

      adapter.push([
        { patch: { "e1/Pos": { x: 10 } }, origin: Origin.ECS },
      ]);
      expect(mockWs.sentMessages).toHaveLength(0);
    });

    it("does nothing with empty mutations", async () => {
      const adapter = createAdapter();
      await adapter.init();

      adapter.push([]);
      expect(mockWs.sentMessages).toHaveLength(0);
    });

    it("sends multiple patches in one message", async () => {
      const adapter = createAdapter();
      await adapter.init();

      adapter.push([
        { patch: { "e1/Pos": { x: 10 } }, origin: Origin.ECS },
        { patch: { "e2/Vel": { vx: 5 } }, origin: Origin.ECS },
      ]);

      expect(mockWs.sentMessages).toHaveLength(1);
      const sent = JSON.parse(mockWs.sentMessages[0]!);
      expect(sent.patches).toHaveLength(2);
    });
  });

  describe("pull / message handling", () => {
    it("returns null when no messages received", async () => {
      const adapter = createAdapter();
      await adapter.init();
      expect(adapter.pull()).toBeNull();
    });

    it("queues mutations from remote clients", async () => {
      const adapter = createAdapter("client-1");
      await adapter.init();

      mockWs.receiveMessage({
        type: "patch",
        patches: [{ "e1/Pos": { x: 99 } }],
        clientId: "client-2",
        timestamp: 100,
      });

      const mutation = adapter.pull();
      expect(mutation).not.toBeNull();
      expect(mutation!.patch).toEqual({ "e1/Pos": { x: 99 } });
      expect(mutation!.origin).toBe(Origin.Websocket);
    });

    it("ignores echoed messages from same client", async () => {
      const adapter = createAdapter("client-1");
      await adapter.init();

      mockWs.receiveMessage({
        type: "patch",
        patches: [{ "e1/Pos": { x: 10 } }],
        clientId: "client-1",
        timestamp: 100,
      });

      expect(adapter.pull()).toBeNull();
    });

    it("handles full-sync messages", async () => {
      const adapter = createAdapter();
      await adapter.init();

      mockWs.receiveMessage({
        type: "full-sync",
        state: {
          "e1/Pos": { x: 10, y: 20 },
          "e2/Vel": { vx: 5 },
        },
        timestamp: 200,
      });

      const mutation = adapter.pull();
      expect(mutation).not.toBeNull();
      expect(mutation!.origin).toBe(Origin.Websocket);
      expect(mutation!.patch["e1/Pos"]).toEqual({
        _exists: true,
        x: 10,
        y: 20,
      });
      expect(mutation!.patch["e2/Vel"]).toEqual({
        _exists: true,
        vx: 5,
      });
    });

    it("handles empty full-sync state", async () => {
      const adapter = createAdapter();
      await adapter.init();

      mockWs.receiveMessage({
        type: "full-sync",
        state: {},
        timestamp: 200,
      });

      expect(adapter.pull()).toBeNull();
    });

    it("ignores malformed JSON messages", async () => {
      const adapter = createAdapter();
      await adapter.init();

      mockWs.dispatchEvent("message", { data: "not-json" });
      expect(adapter.pull()).toBeNull();
    });

    it("clears pending mutations after pull", async () => {
      const adapter = createAdapter("client-1");
      await adapter.init();

      mockWs.receiveMessage({
        type: "patch",
        patches: [{ "e1/Pos": { x: 10 } }],
        clientId: "client-2",
        timestamp: 100,
      });

      adapter.pull(); // consume
      expect(adapter.pull()).toBeNull();
    });

    it("merges multiple patches from one message into a single mutation", async () => {
      const adapter = createAdapter("client-1");
      await adapter.init();

      mockWs.receiveMessage({
        type: "patch",
        patches: [
          { "e1/Pos": { x: 10 } },
          { "e2/Pos": { x: 20 } },
        ],
        clientId: "client-2",
        timestamp: 100,
      });

      const mutation = adapter.pull();
      expect(mutation).not.toBeNull();
      expect(mutation!.patch["e1/Pos"]).toEqual({ x: 10 });
      expect(mutation!.patch["e2/Pos"]).toEqual({ x: 20 });
    });
  });

  describe("close", () => {
    it("closes the WebSocket", async () => {
      const adapter = createAdapter();
      await adapter.init();

      adapter.close();
      expect(mockWs.readyState).toBe(MockWebSocket.CLOSED);
    });

    it("handles close when not initialized", () => {
      const adapter = createAdapter();
      // Should not throw
      adapter.close();
    });
  });

  describe("reconnect", () => {
    it("sends reconnect message with last timestamp", async () => {
      const adapter = createAdapter("client-1");
      await adapter.init();

      // Receive a message to set lastTimestamp
      mockWs.receiveMessage({
        type: "patch",
        patches: [{ "e1/Pos": { x: 10 } }],
        clientId: "client-2",
        timestamp: 500,
      });

      // Reconnect
      await adapter.reconnect();

      // Should send reconnect message
      const sent = mockWs.sentMessages.map((s) => JSON.parse(s));
      const reconnectMsg = sent.find((m) => m.type === "reconnect");
      expect(reconnectMsg).toEqual({
        type: "reconnect",
        lastTimestamp: 500,
      });
    });
  });

  describe("timestamp tracking", () => {
    it("updates lastTimestamp from patch messages", async () => {
      const adapter = createAdapter("client-1");
      await adapter.init();

      mockWs.receiveMessage({
        type: "patch",
        patches: [],
        clientId: "client-2",
        timestamp: 100,
      });

      mockWs.receiveMessage({
        type: "patch",
        patches: [],
        clientId: "client-2",
        timestamp: 200,
      });

      // Reconnect to verify timestamp is tracked
      await adapter.reconnect();
      const sent = mockWs.sentMessages.map((s) => JSON.parse(s));
      const reconnectMsg = sent.find((m) => m.type === "reconnect");
      expect(reconnectMsg?.lastTimestamp).toBe(200);
    });
  });
});
