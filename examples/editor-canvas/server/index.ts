import { mkdir, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { SimpleServer } from "loro-websocket/server";
import { CrdtType } from "loro-protocol";

const DATA_DIR = "./data";

// Ensure data directory exists
if (!existsSync(DATA_DIR)) {
  await mkdir(DATA_DIR, { recursive: true });
}

function getRoomFilePath(roomId: string): string {
  return join(DATA_DIR, `${roomId}.loro`);
}

const server = new SimpleServer({
  port: 8787,
  authenticate: async (_roomId: string, _crdt: any, auth: Uint8Array) => {
    // return "read" | "write" | null
    return new TextDecoder().decode(auth) === "readonly" ? "read" : "write";
  },
  onLoadDocument: async (
    roomId: string,
    _crdt: CrdtType
  ): Promise<Uint8Array | null> => {
    return null;

    const filePath = getRoomFilePath(roomId);

    if (!existsSync(filePath)) {
      console.log("No existing document found for room:", roomId);
      return null;
    }

    try {
      const data = await readFile(filePath);
      console.log(
        "Document loaded for room:",
        roomId,
        "Data size:",
        data.length
      );
      return new Uint8Array(data);
    } catch (error) {
      console.error("Error loading document for room:", roomId, error);
      return null;
    }
  },
  onSaveDocument: async (
    roomId: string,
    _crdt: CrdtType,
    data: Uint8Array
  ): Promise<void> => {
    return;
    const filePath = getRoomFilePath(roomId);

    try {
      await writeFile(filePath, data);
      console.log(
        "Document saved for room:",
        roomId,
        "Data size:",
        data.length,
        "File:",
        filePath
      );
    } catch (error) {
      console.error("Error saving document for room:", roomId, error);
    }
  },
  saveInterval: 6_000,
});

await server.start();
// Later: await server.stop(); flushes any buffered frames before terminating clients
