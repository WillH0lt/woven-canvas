import { createServer } from "node:http";
import { WebSocketServer } from "ws";
import { RoomManager, FileStorage } from "@infinitecanvas/ecs-sync-server";

const PORT = Number(process.env.PORT) || 8087;

const manager = new RoomManager({
  createStorage: (roomId) => new FileStorage({ dir: "./data", roomId }),
  idleTimeout: 60_000,
});

const server = createServer((_req, res) => {
  res.writeHead(200).end("ok");
});

const wss = new WebSocketServer({ server });

wss.on("connection", async (ws, req) => {
  const url = new URL(req.url!, `http://localhost:${PORT}`);
  const roomId = url.searchParams.get("roomId") ?? "default";
  const clientId = url.searchParams.get("clientId");

  if (!clientId) {
    ws.close(1008, "Missing clientId query parameter");
    return;
  }

  const room = await manager.getRoom(roomId);
  room.handleSocketConnect({
    sessionId: crypto.randomUUID(),
    socket: ws,
    clientId,
  });

  console.log(
    `Client ${clientId} connected to room ${roomId} (${room.getSessionCount()} active)`,
  );
});

server.listen(PORT, () => {
  console.log(`ECS sync server listening on ws://localhost:${PORT}`);
  console.log(`Connect: ws://localhost:${PORT}?roomId=myRoom&clientId=myClient`);
});

process.on("SIGINT", () => {
  console.log("\nShutting down...");
  manager.closeAll();
  server.close();
  process.exit(0);
});
