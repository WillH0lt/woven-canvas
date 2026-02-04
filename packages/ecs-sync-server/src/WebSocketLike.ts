/**
 * Minimal WebSocket interface so we aren't tied to any library.
 * Compatible with the `ws` package, browser WebSocket, and most runtimes.
 */
export interface WebSocketLike {
  send(data: string): void;
  close(): void;
  addEventListener(
    event: "message",
    handler: (ev: { data: string }) => void,
  ): void;
  addEventListener(event: "close", handler: () => void): void;
  addEventListener(event: "error", handler: (err: unknown) => void): void;
}
