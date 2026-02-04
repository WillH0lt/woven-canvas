import { describe, it, expect, vi, beforeEach } from "vitest";
import { Room } from "../src/Room";
import { MemoryStorage } from "../src/storage/MemoryStorage";
import type { WebSocketLike } from "../src/WebSocketLike";
import type {
  ServerMessage,
  AckResponse,
  PatchBroadcast,
  ClientCountBroadcast,
} from "../src/types";

// --- Test helpers ---

type MessageHandler = (ev: { data: string }) => void;
type CloseHandler = () => void;
type ErrorHandler = (err: unknown) => void;

function createMockSocket(): WebSocketLike & {
  messages: ServerMessage[];
  triggerMessage: (msg: object) => void;
  triggerClose: () => void;
} {
  let onMessage: MessageHandler | null = null;
  let onClose: CloseHandler | null = null;

  const socket = {
    messages: [] as ServerMessage[],
    send: vi.fn((data: string) => {
      socket.messages.push(JSON.parse(data));
    }),
    close: vi.fn(),
    addEventListener: vi.fn(
      (event: string, handler: MessageHandler | CloseHandler | ErrorHandler) => {
        if (event === "message") onMessage = handler as MessageHandler;
        if (event === "close") onClose = handler as CloseHandler;
      },
    ),
    triggerMessage(msg: object) {
      onMessage?.({ data: JSON.stringify(msg) });
    },
    triggerClose() {
      onClose?.();
    },
  };
  return socket;
}

function connectClient(
  room: Room,
  clientId: string,
  sessionId?: string,
) {
  const socket = createMockSocket();
  const sid = sessionId ?? `session-${clientId}`;
  room.handleSocketConnect({ sessionId: sid, socket, clientId });
  return { socket, sessionId: sid };
}

function getMessages<T extends ServerMessage>(
  socket: ReturnType<typeof createMockSocket>,
  type: T["type"],
): T[] {
  return socket.messages.filter((m) => m.type === type) as T[];
}

function clearMessages(socket: ReturnType<typeof createMockSocket>) {
  socket.messages.length = 0;
}

// --- Tests ---

describe("Room", () => {
  let room: Room;

  beforeEach(() => {
    room = new Room();
  });

  describe("connection lifecycle", () => {
    it("broadcasts clientCount on connect", () => {
      const { socket } = connectClient(room, "alice");
      const counts = getMessages<ClientCountBroadcast>(socket, "clientCount");
      expect(counts).toHaveLength(1);
      expect(counts[0].count).toBe(1);
    });

    it("broadcasts updated clientCount when second client connects", () => {
      const { socket: s1 } = connectClient(room, "alice");
      clearMessages(s1);
      const { socket: s2 } = connectClient(room, "bob");

      // Both clients should get count=2
      const c1 = getMessages<ClientCountBroadcast>(s1, "clientCount");
      const c2 = getMessages<ClientCountBroadcast>(s2, "clientCount");
      expect(c1).toHaveLength(1);
      expect(c1[0].count).toBe(2);
      expect(c2).toHaveLength(1);
      expect(c2[0].count).toBe(2);
    });

    it("broadcasts clientCount on disconnect", () => {
      const { socket: s1 } = connectClient(room, "alice");
      const { socket: s2 } = connectClient(room, "bob");
      clearMessages(s1);
      clearMessages(s2);

      s2.triggerClose();

      const counts = getMessages<ClientCountBroadcast>(s1, "clientCount");
      expect(counts).toHaveLength(1);
      expect(counts[0].count).toBe(1);
    });

    it("calls onSessionRemoved callback", () => {
      const onRemoved = vi.fn();
      room = new Room({ onSessionRemoved: onRemoved });

      const { socket } = connectClient(room, "alice");
      socket.triggerClose();

      expect(onRemoved).toHaveBeenCalledWith(room, {
        sessionId: "session-alice",
        remaining: 0,
      });
    });

    it("tracks sessions", () => {
      connectClient(room, "alice");
      connectClient(room, "bob");
      expect(room.getSessionCount()).toBe(2);
      expect(room.getSessions()).toHaveLength(2);
    });
  });

  describe("patch handling", () => {
    it("acks a patch with the current timestamp", () => {
      const { socket } = connectClient(room, "alice");
      clearMessages(socket);

      socket.triggerMessage({
        type: "patch",
        messageId: "msg-1",
        documentPatches: [{ "entity1/Position": { _exists: true, x: 10, y: 20 } }],
      });

      const acks = getMessages<AckResponse>(socket, "ack");
      expect(acks).toHaveLength(1);
      expect(acks[0].messageId).toBe("msg-1");
      expect(acks[0].timestamp).toBe(1);
    });

    it("broadcasts document patches to other clients", () => {
      const { socket: s1 } = connectClient(room, "alice");
      const { socket: s2 } = connectClient(room, "bob");
      clearMessages(s1);
      clearMessages(s2);

      s1.triggerMessage({
        type: "patch",
        messageId: "msg-1",
        documentPatches: [{ "entity1/Position": { x: 10 } }],
      });

      // Alice gets ack, Bob gets broadcast
      expect(getMessages<AckResponse>(s1, "ack")).toHaveLength(1);
      expect(getMessages<PatchBroadcast>(s1, "patch")).toHaveLength(0);

      const broadcasts = getMessages<PatchBroadcast>(s2, "patch");
      expect(broadcasts).toHaveLength(1);
      expect(broadcasts[0].clientId).toBe("alice");
      expect(broadcasts[0].documentPatches).toEqual([
        { "entity1/Position": { x: 10 } },
      ]);
    });

    it("broadcasts ephemeral patches to other clients", () => {
      const { socket: s1 } = connectClient(room, "alice");
      const { socket: s2 } = connectClient(room, "bob");
      clearMessages(s1);
      clearMessages(s2);

      s1.triggerMessage({
        type: "patch",
        messageId: "msg-1",
        ephemeralPatches: [{ "alice/Cursor": { x: 50, y: 100 } }],
      });

      const broadcasts = getMessages<PatchBroadcast>(s2, "patch");
      expect(broadcasts).toHaveLength(1);
      expect(broadcasts[0].ephemeralPatches).toEqual([
        { "alice/Cursor": { x: 50, y: 100 } },
      ]);
    });

    it("ignores empty patches", () => {
      const { socket: s1 } = connectClient(room, "alice");
      const { socket: s2 } = connectClient(room, "bob");
      clearMessages(s1);
      clearMessages(s2);

      s1.triggerMessage({
        type: "patch",
        messageId: "msg-1",
      });

      expect(getMessages<AckResponse>(s1, "ack")).toHaveLength(0);
      expect(getMessages<PatchBroadcast>(s2, "patch")).toHaveLength(0);
    });

    it("increments timestamp only for document patches", () => {
      const { socket } = connectClient(room, "alice");
      clearMessages(socket);

      // Ephemeral only -- no timestamp bump
      socket.triggerMessage({
        type: "patch",
        messageId: "msg-1",
        ephemeralPatches: [{ "alice/Cursor": { x: 1 } }],
      });
      expect(getMessages<AckResponse>(socket, "ack")[0].timestamp).toBe(0);

      clearMessages(socket);

      // Document -- bumps timestamp
      socket.triggerMessage({
        type: "patch",
        messageId: "msg-2",
        documentPatches: [{ "entity1/Position": { x: 10 } }],
      });
      expect(getMessages<AckResponse>(socket, "ack")[0].timestamp).toBe(1);
    });
  });

  describe("document state", () => {
    it("applies and merges patches field-by-field", () => {
      const { socket } = connectClient(room, "alice");

      socket.triggerMessage({
        type: "patch",
        messageId: "msg-1",
        documentPatches: [{ "e1/Pos": { _exists: true, x: 10, y: 20 } }],
      });
      socket.triggerMessage({
        type: "patch",
        messageId: "msg-2",
        documentPatches: [{ "e1/Pos": { x: 30 } }],
      });

      const snapshot = room.getSnapshot();
      expect(snapshot.state["e1/Pos"]).toEqual({ _exists: true, x: 30, y: 20 });
    });

    it("implicitly adds _exists: true for new keys without it", () => {
      const { socket } = connectClient(room, "alice");

      socket.triggerMessage({
        type: "patch",
        messageId: "msg-1",
        documentPatches: [{ "e1/Pos": { x: 10, y: 20 } }],
      });

      const snapshot = room.getSnapshot();
      expect(snapshot.state["e1/Pos"]).toEqual({ _exists: true, x: 10, y: 20 });
    });

    it("handles tombstone deletions", () => {
      const { socket } = connectClient(room, "alice");

      socket.triggerMessage({
        type: "patch",
        messageId: "msg-1",
        documentPatches: [{ "e1/Pos": { _exists: true, x: 10 } }],
      });
      socket.triggerMessage({
        type: "patch",
        messageId: "msg-2",
        documentPatches: [{ "e1/Pos": { _exists: false } }],
      });

      const snapshot = room.getSnapshot();
      expect(snapshot.state["e1/Pos"]).toBeUndefined();
    });
  });

  describe("ephemeral state", () => {
    it("sends existing ephemeral state to newly connecting clients", () => {
      const { socket: s1 } = connectClient(room, "alice");

      // Alice sends ephemeral state
      s1.triggerMessage({
        type: "patch",
        messageId: "msg-1",
        ephemeralPatches: [{ "alice/Cursor": { x: 50, y: 100 } }],
      });

      // Bob connects and should receive Alice's ephemeral state
      const { socket: s2 } = connectClient(room, "bob");
      const patches = getMessages<PatchBroadcast>(s2, "patch");
      expect(patches).toHaveLength(1);
      expect(patches[0].ephemeralPatches).toEqual([
        { "alice/Cursor": { x: 50, y: 100 } },
      ]);
    });

    it("broadcasts deletion patches when a client disconnects", () => {
      const { socket: s1 } = connectClient(room, "alice");
      const { socket: s2 } = connectClient(room, "bob");

      // Alice sends ephemeral state
      s1.triggerMessage({
        type: "patch",
        messageId: "msg-1",
        ephemeralPatches: [{ "alice/Cursor": { x: 50, y: 100 } }],
      });
      clearMessages(s2);

      // Alice disconnects
      s1.triggerClose();

      const patches = getMessages<PatchBroadcast>(s2, "patch");
      expect(patches).toHaveLength(1);
      expect(patches[0].ephemeralPatches).toEqual([
        { "alice/Cursor": { _exists: false } },
      ]);
      expect(patches[0].clientId).toBe("alice");
    });
  });

  describe("reconnect handling", () => {
    it("sends document diff since lastTimestamp", () => {
      const { socket: s1 } = connectClient(room, "alice");

      // Alice makes some changes
      s1.triggerMessage({
        type: "patch",
        messageId: "msg-1",
        documentPatches: [{ "e1/Pos": { _exists: true, x: 10, y: 20 } }],
      });
      s1.triggerMessage({
        type: "patch",
        messageId: "msg-2",
        documentPatches: [{ "e2/Vel": { _exists: true, dx: 1 } }],
      });

      // Bob reconnects knowing timestamp 1 (missed the second patch)
      const { socket: s2 } = connectClient(room, "bob");
      clearMessages(s2);

      s2.triggerMessage({
        type: "reconnect",
        lastTimestamp: 1,
      });

      const patches = getMessages<PatchBroadcast>(s2, "patch");
      expect(patches).toHaveLength(1);
      // Should only include e2/Vel which was at timestamp 2
      expect(patches[0].documentPatches).toEqual([
        { "e2/Vel": { _exists: true, dx: 1 } },
      ]);
    });

    it("applies offline document patches from reconnecting client", () => {
      connectClient(room, "alice");
      const { socket: s2 } = connectClient(room, "bob");
      clearMessages(s2);

      // Bob reconnects with offline changes
      s2.triggerMessage({
        type: "reconnect",
        lastTimestamp: 0,
        documentPatches: [{ "e1/Pos": { _exists: true, x: 99 } }],
      });

      const snapshot = room.getSnapshot();
      expect(snapshot.state["e1/Pos"]).toEqual({ _exists: true, x: 99 });
    });

    it("sends other clients' ephemeral state on reconnect", () => {
      const { socket: s1 } = connectClient(room, "alice");

      s1.triggerMessage({
        type: "patch",
        messageId: "msg-1",
        ephemeralPatches: [{ "alice/Cursor": { x: 50, y: 100 } }],
      });

      const { socket: s2 } = connectClient(room, "bob");
      clearMessages(s2);

      s2.triggerMessage({
        type: "reconnect",
        lastTimestamp: 0,
      });

      // Bob should receive Alice's ephemeral state
      const patches = getMessages<PatchBroadcast>(s2, "patch");
      // One of the patches should contain ephemeral data
      const ephPatch = patches.find((p) => p.ephemeralPatches?.length);
      expect(ephPatch).toBeDefined();
      expect(ephPatch!.ephemeralPatches).toEqual([
        { "alice/Cursor": { x: 50, y: 100 } },
      ]);
    });

    it("broadcasts reconnecting client's changes to others", () => {
      const { socket: s1 } = connectClient(room, "alice");
      connectClient(room, "bob");
      clearMessages(s1);

      const { socket: s2 } = connectClient(room, "bob", "session-bob");

      // Actually we need to send the reconnect from the same session
      // Let me use the existing bob session
      clearMessages(s1);
      s2.triggerMessage({
        type: "reconnect",
        lastTimestamp: 0,
        documentPatches: [{ "e1/Pos": { _exists: true, x: 42 } }],
      });

      const broadcasts = getMessages<PatchBroadcast>(s1, "patch");
      expect(broadcasts.length).toBeGreaterThanOrEqual(1);
      const docBroadcast = broadcasts.find((b) => b.documentPatches?.length);
      expect(docBroadcast).toBeDefined();
      expect(docBroadcast!.documentPatches).toEqual([
        { "e1/Pos": { _exists: true, x: 42 } },
      ]);
    });
  });

  describe("manual message forwarding", () => {
    it("works with handleSocketMessage", () => {
      const socket = createMockSocket();
      room.handleSocketConnect({
        sessionId: "s1",
        socket,
        clientId: "alice",
      });
      clearMessages(socket);

      room.handleSocketMessage(
        "s1",
        JSON.stringify({
          type: "patch",
          messageId: "msg-1",
          documentPatches: [{ "e1/Pos": { x: 10 } }],
        }),
      );

      const acks = getMessages<AckResponse>(socket, "ack");
      expect(acks).toHaveLength(1);
      expect(acks[0].messageId).toBe("msg-1");
    });

    it("handleSocketClose removes the session", () => {
      const socket = createMockSocket();
      room.handleSocketConnect({
        sessionId: "s1",
        socket,
        clientId: "alice",
      });
      expect(room.getSessionCount()).toBe(1);

      room.handleSocketClose("s1");
      expect(room.getSessionCount()).toBe(0);
    });
  });

  describe("snapshots", () => {
    it("getSnapshot returns current state", () => {
      const { socket } = connectClient(room, "alice");

      socket.triggerMessage({
        type: "patch",
        messageId: "msg-1",
        documentPatches: [
          {
            "e1/Pos": { _exists: true, x: 10, y: 20 },
            "e2/Vel": { _exists: true, dx: 1, dy: 2 },
          },
        ],
      });

      const snap = room.getSnapshot();
      expect(snap.timestamp).toBe(1);
      expect(snap.state["e1/Pos"]).toEqual({ _exists: true, x: 10, y: 20 });
      expect(snap.state["e2/Vel"]).toEqual({ _exists: true, dx: 1, dy: 2 });
      expect(snap.timestamps["e1/Pos"]).toEqual({
        _exists: 1,
        x: 1,
        y: 1,
      });
    });

    it("restores from initialSnapshot", () => {
      const restored = new Room({
        initialSnapshot: {
          timestamp: 5,
          state: { "e1/Pos": { x: 42 } },
          timestamps: { "e1/Pos": { x: 5 } },
        },
      });

      const snap = restored.getSnapshot();
      expect(snap.timestamp).toBe(5);
      expect(snap.state["e1/Pos"]).toEqual({ x: 42 });
    });
  });

  describe("persistence", () => {
    it("calls onDataChange when document patches arrive", () => {
      const onDataChange = vi.fn();
      room = new Room({ onDataChange });

      const { socket } = connectClient(room, "alice");
      socket.triggerMessage({
        type: "patch",
        messageId: "msg-1",
        documentPatches: [{ "e1/Pos": { x: 10 } }],
      });

      expect(onDataChange).toHaveBeenCalledWith(room);
    });

    it("does not call onDataChange for ephemeral-only patches", () => {
      const onDataChange = vi.fn();
      room = new Room({ onDataChange });

      const { socket } = connectClient(room, "alice");
      socket.triggerMessage({
        type: "patch",
        messageId: "msg-1",
        ephemeralPatches: [{ "alice/Cursor": { x: 1 } }],
      });

      expect(onDataChange).not.toHaveBeenCalled();
    });

    it("throttles saves to storage", async () => {
      vi.useFakeTimers();
      const storage = new MemoryStorage();
      const saveSpy = vi.spyOn(storage, "save");

      room = new Room({ storage, saveThrottleMs: 100 });

      const { socket } = connectClient(room, "alice");

      // Send multiple patches rapidly
      socket.triggerMessage({
        type: "patch",
        messageId: "msg-1",
        documentPatches: [{ "e1/Pos": { x: 10 } }],
      });
      socket.triggerMessage({
        type: "patch",
        messageId: "msg-2",
        documentPatches: [{ "e1/Pos": { x: 20 } }],
      });

      // Should not have saved yet
      expect(saveSpy).not.toHaveBeenCalled();

      // Advance past the throttle
      await vi.advanceTimersByTimeAsync(150);

      expect(saveSpy).toHaveBeenCalledTimes(1);
      const savedSnapshot = saveSpy.mock.calls[0][0];
      expect(savedSnapshot.state["e1/Pos"]).toEqual({ x: 20 });

      vi.useRealTimers();
    });

    it("loads state from storage", async () => {
      const storage = new MemoryStorage();
      await storage.save({
        timestamp: 10,
        state: { "e1/Pos": { x: 99 } },
        timestamps: { "e1/Pos": { x: 10 } },
      });

      room = new Room({ storage });
      await room.load();

      const snap = room.getSnapshot();
      expect(snap.timestamp).toBe(10);
      expect(snap.state["e1/Pos"]).toEqual({ x: 99 });
    });
  });

  describe("close", () => {
    it("closes all client sockets", () => {
      const { socket: s1 } = connectClient(room, "alice");
      const { socket: s2 } = connectClient(room, "bob");

      room.close();

      expect(s1.close).toHaveBeenCalled();
      expect(s2.close).toHaveBeenCalled();
      expect(room.getSessionCount()).toBe(0);
    });
  });
});
