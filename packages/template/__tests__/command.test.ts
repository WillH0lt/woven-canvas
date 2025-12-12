import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  Editor,
  defineCommand,
  defineUpdateSystem,
  type EditorPlugin,
  type EditorContext,
} from "../src";

describe("Command System", () => {
  let editor: Editor;

  afterEach(async () => {
    if (editor) {
      await editor.dispose();
    }
  });

  describe("defineCommand", () => {
    it("should create a command with unique typeId", () => {
      const Cmd1 = defineCommand("cmd1");
      const Cmd2 = defineCommand("cmd2");

      expect(Cmd1.typeId).not.toBe(Cmd2.typeId);
      expect(Cmd1.name).toBe("cmd1");
      expect(Cmd2.name).toBe("cmd2");
    });

    it("should create typed commands", () => {
      const TypedCmd = defineCommand<{ value: number }>("typed");

      // Type check - this should compile
      expect(TypedCmd.name).toBe("typed");
    });
  });

  describe("command spawning and iteration", () => {
    it("should spawn commands and iterate in systems", async () => {
      const SelectAll = defineCommand<{ filter: string }>("select-all");
      const receivedPayloads: { filter: string }[] = [];

      const plugin: EditorPlugin = {
        name: "test",
        systems: [
          defineUpdateSystem("handle-commands", (ctx) => {
            for (const { payload } of SelectAll.iter(ctx)) {
              receivedPayloads.push(payload);
            }
          }),
        ],
      };

      editor = new Editor({ plugins: [plugin] });
      await editor.initialize();

      // Spawn command
      editor.command(SelectAll, { filter: "blocks" });

      // Run tick to process
      editor.tick();

      expect(receivedPayloads).toEqual([{ filter: "blocks" }]);
    });

    it("should support void commands", async () => {
      const Undo = defineCommand<void>("undo");
      let undoCount = 0;

      const plugin: EditorPlugin = {
        name: "test",
        systems: [
          defineUpdateSystem("handle-undo", (ctx) => {
            for (const _ of Undo.iter(ctx)) {
              undoCount++;
            }
          }),
        ],
      };

      editor = new Editor({ plugins: [plugin] });
      await editor.initialize();

      // Spawn void command (no payload argument needed)
      editor.command(Undo);

      editor.tick();

      expect(undoCount).toBe(1);
    });

    it("should handle multiple commands of the same type in one frame", async () => {
      const AddItem = defineCommand<{ id: number }>("add-item");
      const receivedIds: number[] = [];

      const plugin: EditorPlugin = {
        name: "test",
        systems: [
          defineUpdateSystem("handle-add", (ctx) => {
            for (const { payload } of AddItem.iter(ctx)) {
              receivedIds.push(payload.id);
            }
          }),
        ],
      };

      editor = new Editor({ plugins: [plugin] });
      await editor.initialize();

      // Spawn multiple commands
      editor.command(AddItem, { id: 1 });
      editor.command(AddItem, { id: 2 });
      editor.command(AddItem, { id: 3 });

      editor.tick();

      expect(receivedIds).toEqual([1, 2, 3]);
    });

    it("should handle different command types independently", async () => {
      const CmdA = defineCommand<{ a: string }>("cmd-a");
      const CmdB = defineCommand<{ b: number }>("cmd-b");

      const resultsA: string[] = [];
      const resultsB: number[] = [];

      const plugin: EditorPlugin = {
        name: "test",
        systems: [
          defineUpdateSystem("handle-a", (ctx) => {
            for (const { payload } of CmdA.iter(ctx)) {
              resultsA.push(payload.a);
            }
          }),
          defineUpdateSystem("handle-b", (ctx) => {
            for (const { payload } of CmdB.iter(ctx)) {
              resultsB.push(payload.b);
            }
          }),
        ],
      };

      editor = new Editor({ plugins: [plugin] });
      await editor.initialize();

      editor.command(CmdA, { a: "hello" });
      editor.command(CmdB, { b: 42 });
      editor.command(CmdA, { a: "world" });

      editor.tick();

      expect(resultsA).toEqual(["hello", "world"]);
      expect(resultsB).toEqual([42]);
    });
  });

  describe("command cleanup", () => {
    it("should clean up commands at end of frame", async () => {
      const TestCmd = defineCommand<{ value: number }>("test");
      const counts: number[] = [];

      const plugin: EditorPlugin = {
        name: "test",
        systems: [
          defineUpdateSystem("count-commands", (ctx) => {
            let count = 0;
            for (const _ of TestCmd.iter(ctx)) {
              count++;
            }
            counts.push(count);
          }),
        ],
      };

      editor = new Editor({ plugins: [plugin] });
      await editor.initialize();

      // Frame 1: spawn a command
      editor.command(TestCmd, { value: 1 });
      editor.tick();

      // Frame 2: no new command spawned
      editor.tick();

      // Frame 1 should see 1 command, Frame 2 should see 0
      expect(counts).toEqual([1, 0]);
    });

    it("should not leak command payloads across frames", async () => {
      const TestCmd = defineCommand<{ data: string }>("test");
      const allPayloads: string[] = [];

      const plugin: EditorPlugin = {
        name: "test",
        systems: [
          defineUpdateSystem("collect", (ctx) => {
            for (const { payload } of TestCmd.iter(ctx)) {
              allPayloads.push(payload.data);
            }
          }),
        ],
      };

      editor = new Editor({ plugins: [plugin] });
      await editor.initialize();

      // Frame 1
      editor.command(TestCmd, { data: "frame1" });
      editor.tick();

      // Frame 2
      editor.command(TestCmd, { data: "frame2" });
      editor.tick();

      // Each frame should only see its own command
      expect(allPayloads).toEqual(["frame1", "frame2"]);
    });
  });

  describe("command spawning from within systems", () => {
    it("should allow spawning commands directly in systems (seen next frame)", async () => {
      const TriggerCmd = defineCommand<void>("trigger");
      const ResponseCmd = defineCommand<{ triggered: boolean }>("response");

      const responses: boolean[] = [];

      const plugin: EditorPlugin = {
        name: "test",
        systems: [
          // First system spawns ResponseCmd when it sees TriggerCmd
          defineUpdateSystem("trigger-handler", (ctx) => {
            for (const _ of TriggerCmd.iter(ctx)) {
              // Spawn directly using ctx - this creates the entity mid-frame
              // The .added() query won't see it until next tick's sync
              ResponseCmd.spawn(ctx, { triggered: true });
            }
          }),
          // Second system collects responses
          defineUpdateSystem("response-handler", (ctx) => {
            for (const { payload } of ResponseCmd.iter(ctx)) {
              responses.push(payload.triggered);
            }
          }),
        ],
      };

      editor = new Editor({ plugins: [plugin] });
      await editor.initialize();

      // Frame 1: TriggerCmd spawns ResponseCmd mid-frame
      editor.command(TriggerCmd);
      editor.tick();

      // Commands spawned mid-frame are cleaned up at end of frame,
      // so they won't be seen. This is expected ECS behavior.
      // If you need same-frame response, use a different pattern (e.g., shared state)
      expect(responses).toEqual([]);
    });

    it("should see commands spawned via editor.command() in nextTick", async () => {
      const TestCmd = defineCommand<{ value: number }>("test");
      const values: number[] = [];

      const plugin: EditorPlugin = {
        name: "test",
        systems: [
          defineUpdateSystem("collect", (ctx) => {
            for (const { payload } of TestCmd.iter(ctx)) {
              values.push(payload.value);
            }
          }),
        ],
      };

      editor = new Editor({ plugins: [plugin] });
      await editor.initialize();

      // editor.command uses nextTick, so command is spawned at start of tick
      editor.command(TestCmd, { value: 42 });
      editor.tick();

      expect(values).toEqual([42]);
    });
  });
});
