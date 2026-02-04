import { describe, it, expect, vi, beforeEach } from "vitest";
import { RoomManager } from "../src/RoomManager";
import { MemoryStorage } from "../src/storage/MemoryStorage";
import type { WebSocketLike } from "../src/WebSocketLike";
import type { ServerMessage } from "../src/types";

function createMockSocket(): WebSocketLike & {
  messages: ServerMessage[];
  triggerClose: () => void;
} {
  let onClose: (() => void) | null = null;

  const socket = {
    messages: [] as ServerMessage[],
    send: vi.fn((data: string) => {
      socket.messages.push(JSON.parse(data));
    }),
    close: vi.fn(),
    addEventListener: vi.fn((event: string, handler: (...args: any[]) => void) => {
      if (event === "close") onClose = handler;
    }),
    triggerClose() {
      onClose?.();
    },
  };
  return socket;
}

describe("RoomManager", () => {
  let manager: RoomManager;

  beforeEach(() => {
    manager = new RoomManager({
      createStorage: () => new MemoryStorage(),
      idleTimeout: 50,
    });
  });

  it("creates and returns rooms", async () => {
    const room = await manager.getRoom("room-1");
    expect(room).toBeDefined();
    expect(room.getSessionCount()).toBe(0);
  });

  it("returns the same room for the same id", async () => {
    const room1 = await manager.getRoom("room-1");
    const room2 = await manager.getRoom("room-1");
    expect(room1).toBe(room2);
  });

  it("creates different rooms for different ids", async () => {
    const room1 = await manager.getRoom("room-1");
    const room2 = await manager.getRoom("room-2");
    expect(room1).not.toBe(room2);
  });

  it("lists room ids", async () => {
    await manager.getRoom("room-1");
    await manager.getRoom("room-2");
    expect(manager.getRoomIds().sort()).toEqual(["room-1", "room-2"]);
  });

  it("closes a specific room", async () => {
    const room = await manager.getRoom("room-1");
    const socket = createMockSocket();
    room.handleSocketConnect({
      sessionId: "s1",
      socket,
      clientId: "alice",
    });

    manager.closeRoom("room-1");

    expect(socket.close).toHaveBeenCalled();
    expect(manager.getRoomIds()).toEqual([]);
  });

  it("closes all rooms", async () => {
    await manager.getRoom("room-1");
    await manager.getRoom("room-2");

    manager.closeAll();

    expect(manager.getRoomIds()).toEqual([]);
  });

  it("auto-closes empty rooms after idle timeout", async () => {
    vi.useFakeTimers();

    const room = await manager.getRoom("room-1");
    const socket = createMockSocket();
    room.handleSocketConnect({
      sessionId: "s1",
      socket,
      clientId: "alice",
    });

    // Disconnect the client
    socket.triggerClose();

    // Room still exists immediately
    expect(manager.getRoomIds()).toEqual(["room-1"]);

    // Advance past idle timeout
    await vi.advanceTimersByTimeAsync(100);

    expect(manager.getRoomIds()).toEqual([]);

    vi.useRealTimers();
  });

  it("cancels idle timeout when a new client connects", async () => {
    vi.useFakeTimers();

    const room = await manager.getRoom("room-1");
    const s1 = createMockSocket();
    room.handleSocketConnect({ sessionId: "s1", socket: s1, clientId: "alice" });

    // Disconnect first client (triggers idle timer)
    s1.triggerClose();

    // New client reconnects before timeout
    await vi.advanceTimersByTimeAsync(25);
    // Getting the room again should cancel the idle timer
    const sameRoom = await manager.getRoom("room-1");
    const s2 = createMockSocket();
    sameRoom.handleSocketConnect({
      sessionId: "s2",
      socket: s2,
      clientId: "bob",
    });

    // Advance past the original timeout
    await vi.advanceTimersByTimeAsync(100);

    // Room should still exist because we cancelled the timer
    expect(manager.getRoomIds()).toEqual(["room-1"]);

    vi.useRealTimers();
  });

  it("getExistingRoom returns undefined for unknown rooms", () => {
    expect(manager.getExistingRoom("nope")).toBeUndefined();
  });

  it("getExistingRoom returns room if it exists", async () => {
    const room = await manager.getRoom("room-1");
    expect(manager.getExistingRoom("room-1")).toBe(room);
  });
});
