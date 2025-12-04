import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { field, defineComponent } from "../src/index";
import { EntityBuffer } from "../src/EntityBuffer";
import { EventBuffer } from "../src/EventBuffer";
import {
  setupWorker,
  initializeComponentInWorker,
  __resetWorkerState,
} from "../src/Worker";
import type {
  Context,
  InitMessage,
  ExecuteMessage,
  WorkerSuccessResponse,
  WorkerErrorResponse,
  ComponentTransferData,
} from "../src/types";

// Mock the global self object for worker environment
const mockPostMessage = vi.fn();
const mockSelf = {
  postMessage: mockPostMessage,
  onmessage: null as ((e: MessageEvent) => void) | null,
};

// Store the original global self
const originalSelf = globalThis.self;

describe("Worker", () => {
  let Position: ReturnType<typeof defineComponent>;
  let Velocity: ReturnType<typeof defineComponent>;

  beforeEach(() => {
    // Reset worker internal state
    __resetWorkerState();

    // Reset mocks
    vi.clearAllMocks();
    mockSelf.onmessage = null;

    // Mock self globally
    (globalThis as any).self = mockSelf;

    // Define test components
    Position = defineComponent("Position", {
      x: field.float32().default(0),
      y: field.float32().default(0),
    });

    Velocity = defineComponent("Velocity", {
      dx: field.float32().default(0),
      dy: field.float32().default(0),
    });
  });

  afterEach(() => {
    // Restore original self
    (globalThis as any).self = originalSelf;
  });

  describe("setupWorker", () => {
    it("should set up message handler on self", () => {
      const execute = vi.fn();

      setupWorker(execute);

      expect(mockSelf.onmessage).toBeDefined();
      expect(typeof mockSelf.onmessage).toBe("function");
    });

    it("should not call execute immediately", () => {
      const execute = vi.fn();

      setupWorker(execute);

      expect(execute).not.toHaveBeenCalled();
    });
  });

  describe("Message Handling", () => {
    it("should handle init message and create context", () => {
      const execute = vi.fn();

      setupWorker(execute);

      // Create a mock entity buffer
      const componentCount = 2;
      const maxEntities = 100;
      const entityBuffer = new EntityBuffer(maxEntities, componentCount);

      const eventBuffer = new EventBuffer();

      // Initialize components for transfer data
      Position.initialize(0, maxEntities, eventBuffer);
      Velocity.initialize(1, maxEntities, eventBuffer);

      const componentData: ComponentTransferData = {
        Position: {
          name: "Position",
          componentId: 0,
          buffer: Position.buffer,
        },
        Velocity: {
          name: "Velocity",
          componentId: 1,
          buffer: Velocity.buffer,
        },
      };

      const initMessage: InitMessage = {
        type: "init",
        index: 1,
        entitySAB: entityBuffer.getBuffer() as SharedArrayBuffer,
        eventSAB: eventBuffer.getBuffer() as SharedArrayBuffer,
        componentData,
        maxEntities,
        componentCount,
      };

      // Simulate receiving the init message
      const messageEvent = { data: initMessage } as MessageEvent<InitMessage>;
      mockSelf.onmessage!(messageEvent);

      // Should send success response
      expect(mockPostMessage).toHaveBeenCalledWith({
        index: 1,
        result: true,
      } satisfies WorkerSuccessResponse);
    });

    it("should handle execute message after init", () => {
      const execute = vi.fn();

      setupWorker(execute);

      // Create a mock entity buffer
      const componentCount = 2;
      const maxEntities = 100;
      const entityBuffer = new EntityBuffer(maxEntities, componentCount);

      // Need fresh components for this test
      const TestPosition = defineComponent("TestPosition", {
        x: field.float32().default(0),
        y: field.float32().default(0),
      });

      const eventBuffer = new EventBuffer();

      TestPosition.initialize(0, maxEntities, eventBuffer);

      const componentData: ComponentTransferData = {
        TestPosition: {
          name: "TestPosition",
          componentId: 0,
          buffer: TestPosition.buffer,
        },
      };

      // First, send init message
      const initMessage: InitMessage = {
        type: "init",
        index: 1,
        entitySAB: entityBuffer.getBuffer() as SharedArrayBuffer,
        eventSAB: eventBuffer.getBuffer() as SharedArrayBuffer,
        componentData,
        maxEntities,
        componentCount,
      };

      mockSelf.onmessage!({ data: initMessage } as MessageEvent<InitMessage>);
      mockPostMessage.mockClear();

      // Then send execute message
      const executeMessage: ExecuteMessage = {
        type: "execute",
        index: 2,
      };

      mockSelf.onmessage!({
        data: executeMessage,
      } as MessageEvent<ExecuteMessage>);

      // Execute should have been called with context
      expect(execute).toHaveBeenCalledTimes(1);

      const callArg = execute.mock.calls[0][0] as Context;
      // Check entityBuffer has expected properties
      expect(callArg.entityBuffer).toBeDefined();
      expect(callArg.entityBuffer).toBeInstanceOf(EntityBuffer);
      expect(callArg.components).toEqual({});
      expect(callArg.maxEntities).toBe(maxEntities);
      expect(callArg.componentCount).toBe(componentCount);

      // Should send success response
      expect(mockPostMessage).toHaveBeenCalledWith({
        index: 2,
        result: true,
      } satisfies WorkerSuccessResponse);
    });

    it("should send error if execute called before init", () => {
      const execute = vi.fn();

      setupWorker(execute);

      // Send execute message without init
      const executeMessage: ExecuteMessage = {
        type: "execute",
        index: 1,
      };

      mockSelf.onmessage!({
        data: executeMessage,
      } as MessageEvent<ExecuteMessage>);

      // Should send error response
      expect(mockPostMessage).toHaveBeenCalledWith({
        index: 1,
        error: "Entity buffer not initialized",
      } satisfies WorkerErrorResponse);
    });

    it("should handle state reset and re-initialization", () => {
      // First set up worker properly
      const execute = vi.fn();
      setupWorker(execute);

      // Reset state (simulating module reload)
      __resetWorkerState();

      // Call setupWorker again to set up fresh state
      setupWorker(execute);

      const initMessage: InitMessage = {
        type: "init",
        index: 1,
        entitySAB: new SharedArrayBuffer(100),
        eventSAB: new SharedArrayBuffer(1024),
        componentData: {},
        maxEntities: 100,
        componentCount: 2,
      };

      mockSelf.onmessage!({ data: initMessage } as MessageEvent<InitMessage>);

      // Should succeed since we called setupWorker
      expect(mockPostMessage).toHaveBeenCalledWith({
        index: 1,
        result: true,
      });
    });

    it("should handle async execute functions", async () => {
      const execute = vi.fn().mockResolvedValue(undefined);

      setupWorker(execute);

      // Create a mock entity buffer
      const componentCount = 1;
      const maxEntities = 100;
      const entityBuffer = new EntityBuffer(maxEntities, componentCount);

      const eventBuffer = new EventBuffer();

      const AsyncPosition = defineComponent("AsyncPosition", {
        x: field.float32().default(0),
      });
      AsyncPosition.initialize(0, maxEntities, eventBuffer);

      const componentData: ComponentTransferData = {
        AsyncPosition: {
          name: "AsyncPosition",
          componentId: 0,
          buffer: AsyncPosition.buffer,
        },
      };

      const initMessage: InitMessage = {
        type: "init",
        index: 1,
        entitySAB: entityBuffer.getBuffer() as SharedArrayBuffer,
        eventSAB: eventBuffer.getBuffer() as SharedArrayBuffer,
        componentData,
        maxEntities,
        componentCount,
      };

      mockSelf.onmessage!({ data: initMessage } as MessageEvent<InitMessage>);
      mockPostMessage.mockClear();

      const executeMessage: ExecuteMessage = {
        type: "execute",
        index: 2,
      };

      mockSelf.onmessage!({
        data: executeMessage,
      } as MessageEvent<ExecuteMessage>);

      // Wait for async execution
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(execute).toHaveBeenCalled();
    });

    it("should handle errors in execute function", () => {
      const execute = vi.fn().mockImplementation(() => {
        throw new Error("Test error in execute");
      });

      setupWorker(execute);

      // Create a mock entity buffer
      const componentCount = 1;
      const maxEntities = 100;
      const entityBuffer = new EntityBuffer(maxEntities, componentCount);

      const eventBuffer = new EventBuffer();

      const ErrorPosition = defineComponent("ErrorPosition", {
        x: field.float32().default(0),
      });
      ErrorPosition.initialize(0, maxEntities, eventBuffer);

      const componentData: ComponentTransferData = {
        ErrorPosition: {
          name: "ErrorPosition",
          componentId: 0,
          buffer: ErrorPosition.buffer,
        },
      };

      const initMessage: InitMessage = {
        type: "init",
        index: 1,
        entitySAB: entityBuffer.getBuffer() as SharedArrayBuffer,
        eventSAB: eventBuffer.getBuffer() as SharedArrayBuffer,
        componentData,
        maxEntities,
        componentCount,
      };

      mockSelf.onmessage!({ data: initMessage } as MessageEvent<InitMessage>);
      mockPostMessage.mockClear();

      const executeMessage: ExecuteMessage = {
        type: "execute",
        index: 2,
      };

      mockSelf.onmessage!({
        data: executeMessage,
      } as MessageEvent<ExecuteMessage>);

      // Should send error response
      expect(mockPostMessage).toHaveBeenCalledWith({
        index: 2,
        error: "Test error in execute",
      } satisfies WorkerErrorResponse);
    });
  });

  describe("initializeComponentInWorker", () => {
    it("should return false when worker is not initialized", () => {
      const TestComponent = defineComponent("TestComponent", {
        value: field.float32().default(0),
      });

      const result = initializeComponentInWorker(TestComponent);

      expect(result).toBe(false);
    });

    it("should return false when component is not in transfer data", () => {
      const execute = vi.fn();

      setupWorker(execute);

      const componentCount = 1;
      const maxEntities = 100;
      const entityBuffer = new EntityBuffer(maxEntities, componentCount);

      const eventBuffer = new EventBuffer();

      const KnownComponent = defineComponent("KnownComponent", {
        x: field.float32().default(0),
      });
      KnownComponent.initialize(0, maxEntities, eventBuffer);

      const componentData: ComponentTransferData = {
        KnownComponent: {
          name: "KnownComponent",
          componentId: 0,
          buffer: KnownComponent.buffer,
        },
      };

      const initMessage: InitMessage = {
        type: "init",
        index: 1,
        entitySAB: entityBuffer.getBuffer() as SharedArrayBuffer,
        eventSAB: eventBuffer.getBuffer() as SharedArrayBuffer,
        componentData,
        maxEntities,
        componentCount,
      };

      mockSelf.onmessage!({ data: initMessage } as MessageEvent<InitMessage>);

      // Try to initialize a component that wasn't in the transfer data
      const UnknownComponent = defineComponent("UnknownComponent", {
        value: field.float32().default(0),
      });

      // Mock console.warn
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const result = initializeComponentInWorker(UnknownComponent);

      expect(result).toBe(false);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("UnknownComponent")
      );

      warnSpy.mockRestore();
    });

    it("should initialize component from transfer data", () => {
      const execute = vi.fn();

      setupWorker(execute);

      const componentCount = 1;
      const maxEntities = 100;
      const entityBuffer = new EntityBuffer(maxEntities, componentCount);

      const eventBuffer = new EventBuffer();

      // Create and initialize a component on "main thread"
      const MainPosition = defineComponent("TransferPosition", {
        x: field.float32().default(0),
        y: field.float32().default(0),
      });
      MainPosition.initialize(0, maxEntities, eventBuffer);

      const componentData: ComponentTransferData = {
        TransferPosition: {
          name: "TransferPosition",
          componentId: 0,
          buffer: MainPosition.buffer,
        },
      };

      const initMessage: InitMessage = {
        type: "init",
        index: 1,
        entitySAB: entityBuffer.getBuffer() as SharedArrayBuffer,
        eventSAB: eventBuffer.getBuffer() as SharedArrayBuffer,
        componentData,
        maxEntities,
        componentCount,
      };

      mockSelf.onmessage!({ data: initMessage } as MessageEvent<InitMessage>);

      // Create a new component instance (as would exist in worker)
      const WorkerPosition = defineComponent("TransferPosition", {
        x: field.float32().default(0),
        y: field.float32().default(0),
      });

      const result = initializeComponentInWorker(WorkerPosition);

      expect(result).toBe(true);
      expect(WorkerPosition.componentId).toBe(0);
    });
  });

  describe("Context", () => {
    it("should have correct context properties", () => {
      let capturedContext: Context | null = null;

      const execute = vi.fn((ctx: Context) => {
        capturedContext = ctx;
      });

      setupWorker(execute);

      const componentCount = 1;
      const maxEntities = 100;
      const entityBuffer = new EntityBuffer(maxEntities, componentCount);

      const eventBuffer = new EventBuffer();

      const ContextPosition = defineComponent("ContextPosition", {
        x: field.float32().default(0),
      });
      ContextPosition.initialize(0, maxEntities, eventBuffer);

      const componentData: ComponentTransferData = {
        ContextPosition: {
          name: "ContextPosition",
          componentId: 0,
          buffer: ContextPosition.buffer,
        },
      };

      const initMessage: InitMessage = {
        type: "init",
        index: 1,
        entitySAB: entityBuffer.getBuffer() as SharedArrayBuffer,
        eventSAB: eventBuffer.getBuffer() as SharedArrayBuffer,
        componentData,
        maxEntities,
        componentCount,
      };

      mockSelf.onmessage!({ data: initMessage } as MessageEvent<InitMessage>);

      const executeMessage: ExecuteMessage = {
        type: "execute",
        index: 2,
      };

      mockSelf.onmessage!({
        data: executeMessage,
      } as MessageEvent<ExecuteMessage>);

      expect(capturedContext).not.toBeNull();
      expect(capturedContext!.entityBuffer).toBeDefined();
    });

    it("should have correct maxEntities and componentCount", () => {
      let capturedContext: Context | null = null;

      const execute = vi.fn((ctx: Context) => {
        capturedContext = ctx;
      });

      setupWorker(execute);

      const componentCount = 5;
      const maxEntities = 500;
      const entityBuffer = new EntityBuffer(maxEntities, componentCount);

      const eventBuffer = new EventBuffer();

      const CountPosition = defineComponent("CountPosition", {
        x: field.float32().default(0),
      });
      CountPosition.initialize(0, maxEntities, eventBuffer);

      const componentData: ComponentTransferData = {
        CountPosition: {
          name: "CountPosition",
          componentId: 0,
          buffer: CountPosition.buffer,
        },
      };

      const initMessage: InitMessage = {
        type: "init",
        index: 1,
        entitySAB: entityBuffer.getBuffer() as SharedArrayBuffer,
        eventSAB: eventBuffer.getBuffer() as SharedArrayBuffer,
        componentData,
        maxEntities,
        componentCount,
      };

      mockSelf.onmessage!({ data: initMessage } as MessageEvent<InitMessage>);

      const executeMessage: ExecuteMessage = {
        type: "execute",
        index: 2,
      };

      mockSelf.onmessage!({
        data: executeMessage,
      } as MessageEvent<ExecuteMessage>);

      expect(capturedContext).not.toBeNull();
      expect(capturedContext!.maxEntities).toBe(maxEntities);
      expect(capturedContext!.componentCount).toBe(componentCount);
    });

    it("should have empty components object initially", () => {
      let capturedContext: Context | null = null;

      const execute = vi.fn((ctx: Context) => {
        capturedContext = ctx;
      });

      setupWorker(execute);

      const componentCount = 1;
      const maxEntities = 100;
      const entityBuffer = new EntityBuffer(maxEntities, componentCount);

      const eventBuffer = new EventBuffer();

      const EmptyPosition = defineComponent("EmptyPosition", {
        x: field.float32().default(0),
      });
      EmptyPosition.initialize(0, maxEntities, eventBuffer);

      const componentData: ComponentTransferData = {
        EmptyPosition: {
          name: "EmptyPosition",
          componentId: 0,
          buffer: EmptyPosition.buffer,
        },
      };

      const initMessage: InitMessage = {
        type: "init",
        index: 1,
        entitySAB: entityBuffer.getBuffer() as SharedArrayBuffer,
        eventSAB: eventBuffer.getBuffer() as SharedArrayBuffer,
        componentData,
        maxEntities,
        componentCount,
      };

      mockSelf.onmessage!({ data: initMessage } as MessageEvent<InitMessage>);

      const executeMessage: ExecuteMessage = {
        type: "execute",
        index: 2,
      };

      mockSelf.onmessage!({
        data: executeMessage,
      } as MessageEvent<ExecuteMessage>);

      expect(capturedContext).not.toBeNull();
      expect(capturedContext!.components).toEqual({});
    });
  });
});
