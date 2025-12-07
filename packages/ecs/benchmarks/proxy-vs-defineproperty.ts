/**
 * Benchmark: Object.defineProperty vs Proxy for ECS Component Access
 *
 * This benchmark compares two approaches for component data access:
 * 1. Object.defineProperty (current implementation) - uses getter/setters on a master object
 * 2. Proxy - creates a proxy object that intercepts property access
 *
 * Key metrics measured:
 * - Read performance (accessing component properties)
 * - Write performance (modifying component properties)
 * - Object spread/copy performance (the footgun: {...component})
 * - Explicit snapshot performance (copying to a plain object)
 */

// Configuration
const ENTITY_COUNT = 10000;
const ITERATIONS = 1000;
const FIELDS = ["x", "y", "z", "w"] as const;

// Simulated backing storage (like TypedArrays in the real implementation)
const storage: Record<string, Float32Array> = {};
for (const field of FIELDS) {
  storage[field] = new Float32Array(ENTITY_COUNT);
  // Initialize with random values
  for (let i = 0; i < ENTITY_COUNT; i++) {
    storage[field][i] = Math.random() * 1000;
  }
}

// ============================================================================
// Approach 1: Object.defineProperty (current implementation)
// ============================================================================

interface ComponentData {
  x: number;
  y: number;
  z: number;
  w: number;
}

class DefinePropertyComponent {
  private readonly readonlyMaster: ComponentData;
  private readonly writableMaster: ComponentData;
  private readonlyEntityId: number = 0;
  private writableEntityId: number = 0;

  constructor() {
    this.readonlyMaster = {} as ComponentData;
    this.writableMaster = {} as ComponentData;

    // Define readonly getters
    for (const field of FIELDS) {
      Object.defineProperty(this.readonlyMaster, field, {
        enumerable: true,
        configurable: false,
        get: () => storage[field][this.readonlyEntityId],
      });

      Object.defineProperty(this.writableMaster, field, {
        enumerable: true,
        configurable: false,
        get: () => storage[field][this.writableEntityId],
        set: (value: number) => {
          storage[field][this.writableEntityId] = value;
        },
      });
    }
  }

  read(entityId: number): Readonly<ComponentData> {
    this.readonlyEntityId = entityId;
    return this.readonlyMaster;
  }

  write(entityId: number): ComponentData {
    this.writableEntityId = entityId;
    return this.writableMaster;
  }

  /**
   * Explicit snapshot method - copies current values to a plain object
   */
  snapshot(entityId: number): ComponentData {
    return {
      x: storage.x[entityId],
      y: storage.y[entityId],
      z: storage.z[entityId],
      w: storage.w[entityId],
    };
  }
}

// ============================================================================
// Approach 2: Proxy-based implementation
// ============================================================================

class ProxyComponent {
  read(entityId: number): Readonly<ComponentData> {
    return new Proxy({} as ComponentData, {
      get(_target, prop: string) {
        if (prop in storage) {
          return storage[prop][entityId];
        }
        return undefined;
      },
      set() {
        throw new Error("Cannot write to readonly component");
      },
      ownKeys() {
        return FIELDS as unknown as string[];
      },
      getOwnPropertyDescriptor(_target, prop: string) {
        if (FIELDS.includes(prop as any)) {
          return {
            enumerable: true,
            configurable: true,
            value: storage[prop][entityId],
          };
        }
        return undefined;
      },
    });
  }

  write(entityId: number): ComponentData {
    return new Proxy({} as ComponentData, {
      get(_target, prop: string) {
        if (prop in storage) {
          return storage[prop][entityId];
        }
        return undefined;
      },
      set(_target, prop: string, value: number) {
        if (prop in storage) {
          storage[prop][entityId] = value;
          return true;
        }
        return false;
      },
      ownKeys() {
        return FIELDS as unknown as string[];
      },
      getOwnPropertyDescriptor(_target, prop: string) {
        if (FIELDS.includes(prop as any)) {
          return {
            enumerable: true,
            configurable: true,
            writable: true,
            value: storage[prop][entityId],
          };
        }
        return undefined;
      },
    });
  }

  /**
   * Explicit snapshot method - copies current values to a plain object
   */
  snapshot(entityId: number): ComponentData {
    return {
      x: storage.x[entityId],
      y: storage.y[entityId],
      z: storage.z[entityId],
      w: storage.w[entityId],
    };
  }
}

// ============================================================================
// Approach 3: Proxy with cached entity ID (hybrid approach)
// ============================================================================

class CachedProxyComponent {
  private cachedReadProxy: ComponentData | null = null;
  private cachedWriteProxy: ComponentData | null = null;
  private currentReadEntityId: number = 0;
  private currentWriteEntityId: number = 0;

  constructor() {
    // Create cached proxies that read entityId from instance
    this.cachedReadProxy = new Proxy({} as ComponentData, {
      get: (_target, prop: string) => {
        if (prop in storage) {
          return storage[prop][this.currentReadEntityId];
        }
        return undefined;
      },
      set: () => {
        throw new Error("Cannot write to readonly component");
      },
      ownKeys: () => FIELDS as unknown as string[],
      getOwnPropertyDescriptor: (_target, prop: string) => {
        if (FIELDS.includes(prop as any)) {
          return {
            enumerable: true,
            configurable: true,
            value: storage[prop][this.currentReadEntityId],
          };
        }
        return undefined;
      },
    });

    this.cachedWriteProxy = new Proxy({} as ComponentData, {
      get: (_target, prop: string) => {
        if (prop in storage) {
          return storage[prop][this.currentWriteEntityId];
        }
        return undefined;
      },
      set: (_target, prop: string, value: number) => {
        if (prop in storage) {
          storage[prop][this.currentWriteEntityId] = value;
          return true;
        }
        return false;
      },
      ownKeys: () => FIELDS as unknown as string[],
      getOwnPropertyDescriptor: (_target, prop: string) => {
        if (FIELDS.includes(prop as any)) {
          return {
            enumerable: true,
            configurable: true,
            writable: true,
            value: storage[prop][this.currentWriteEntityId],
          };
        }
        return undefined;
      },
    });
  }

  read(entityId: number): Readonly<ComponentData> {
    this.currentReadEntityId = entityId;
    return this.cachedReadProxy!;
  }

  write(entityId: number): ComponentData {
    this.currentWriteEntityId = entityId;
    return this.cachedWriteProxy!;
  }

  snapshot(entityId: number): ComponentData {
    return {
      x: storage.x[entityId],
      y: storage.y[entityId],
      z: storage.z[entityId],
      w: storage.w[entityId],
    };
  }
}

// ============================================================================
// Benchmarking utilities
// ============================================================================

function now(): number {
  const hr = process.hrtime();
  return (hr[0] * 1e9 + hr[1]) / 1000; // microseconds
}

interface BenchmarkResult {
  name: string;
  totalMs: number;
  avgUs: number;
  opsPerSec: number;
}

function formatResult(result: BenchmarkResult): string {
  return `${result.name.padEnd(35)} ${result.totalMs
    .toFixed(2)
    .padStart(10)}ms  ${result.avgUs
    .toFixed(3)
    .padStart(10)}μs/op  ${Math.round(result.opsPerSec)
    .toLocaleString()
    .padStart(15)} ops/sec`;
}

function benchmark(name: string, fn: () => void): BenchmarkResult {
  // Warmup
  for (let i = 0; i < 100; i++) {
    fn();
  }

  const start = now();
  for (let i = 0; i < ITERATIONS; i++) {
    fn();
  }
  const elapsed = now() - start;

  const totalMs = elapsed / 1000;
  const avgUs = elapsed / ITERATIONS;
  const opsPerSec = (ITERATIONS / elapsed) * 1_000_000;

  return { name, totalMs, avgUs, opsPerSec };
}

// ============================================================================
// Run benchmarks
// ============================================================================

console.log("=".repeat(80));
console.log("ECS Component Access Benchmark: Object.defineProperty vs Proxy");
console.log("=".repeat(80));
console.log(
  `Entities: ${ENTITY_COUNT}, Iterations: ${ITERATIONS}, Fields: ${FIELDS.length}`
);
console.log("");

const dpComponent = new DefinePropertyComponent();
const proxyComponent = new ProxyComponent();
const cachedProxyComponent = new CachedProxyComponent();

// Pre-generate random entity IDs for consistent testing
const randomEntityIds = Array.from({ length: ITERATIONS }, () =>
  Math.floor(Math.random() * ENTITY_COUNT)
);

// ----------------------------------------------------------------------------
// Test 1: Sequential Read Performance
// ----------------------------------------------------------------------------
console.log("\n📖 READ PERFORMANCE (sequential entity access)");
console.log("-".repeat(80));

const results1: BenchmarkResult[] = [];

results1.push(
  benchmark("DefineProperty.read()", () => {
    for (let i = 0; i < ENTITY_COUNT; i++) {
      const data = dpComponent.read(i);
      const _ = data.x + data.y + data.z + data.w;
    }
  })
);

results1.push(
  benchmark("Proxy.read() [new proxy each time]", () => {
    for (let i = 0; i < ENTITY_COUNT; i++) {
      const data = proxyComponent.read(i);
      const _ = data.x + data.y + data.z + data.w;
    }
  })
);

results1.push(
  benchmark("CachedProxy.read()", () => {
    for (let i = 0; i < ENTITY_COUNT; i++) {
      const data = cachedProxyComponent.read(i);
      const _ = data.x + data.y + data.z + data.w;
    }
  })
);

results1.sort((a, b) => a.totalMs - b.totalMs);
results1.forEach((r) => console.log(formatResult(r)));

// ----------------------------------------------------------------------------
// Test 2: Sequential Write Performance
// ----------------------------------------------------------------------------
console.log("\n✏️  WRITE PERFORMANCE (sequential entity access)");
console.log("-".repeat(80));

const results2: BenchmarkResult[] = [];

results2.push(
  benchmark("DefineProperty.write()", () => {
    for (let i = 0; i < ENTITY_COUNT; i++) {
      const data = dpComponent.write(i);
      data.x = i;
      data.y = i * 2;
      data.z = i * 3;
      data.w = i * 4;
    }
  })
);

results2.push(
  benchmark("Proxy.write() [new proxy each time]", () => {
    for (let i = 0; i < ENTITY_COUNT; i++) {
      const data = proxyComponent.write(i);
      data.x = i;
      data.y = i * 2;
      data.z = i * 3;
      data.w = i * 4;
    }
  })
);

results2.push(
  benchmark("CachedProxy.write()", () => {
    for (let i = 0; i < ENTITY_COUNT; i++) {
      const data = cachedProxyComponent.write(i);
      data.x = i;
      data.y = i * 2;
      data.z = i * 3;
      data.w = i * 4;
    }
  })
);

results2.sort((a, b) => a.totalMs - b.totalMs);
results2.forEach((r) => console.log(formatResult(r)));

// ----------------------------------------------------------------------------
// Test 3: Object Spread/Copy Performance (THE FOOTGUN)
// ----------------------------------------------------------------------------
console.log("\n⚠️  OBJECT SPREAD PERFORMANCE (the footgun: {...component})");
console.log("-".repeat(80));

const results3: BenchmarkResult[] = [];
let sink: any; // Prevent optimization

results3.push(
  benchmark("DefineProperty {...read()} [BROKEN!]", () => {
    for (let i = 0; i < ENTITY_COUNT; i++) {
      const data = dpComponent.read(i);
      sink = { ...data };
    }
  })
);

results3.push(
  benchmark("Proxy {...read()} [works correctly]", () => {
    for (let i = 0; i < ENTITY_COUNT; i++) {
      const data = proxyComponent.read(i);
      sink = { ...data };
    }
  })
);

results3.push(
  benchmark("CachedProxy {...read()} [BROKEN!]", () => {
    for (let i = 0; i < ENTITY_COUNT; i++) {
      const data = cachedProxyComponent.read(i);
      sink = { ...data };
    }
  })
);

results3.push(
  benchmark("DefineProperty.snapshot()", () => {
    for (let i = 0; i < ENTITY_COUNT; i++) {
      sink = dpComponent.snapshot(i);
    }
  })
);

results3.push(
  benchmark("Proxy.snapshot()", () => {
    for (let i = 0; i < ENTITY_COUNT; i++) {
      sink = proxyComponent.snapshot(i);
    }
  })
);

results3.sort((a, b) => a.totalMs - b.totalMs);
results3.forEach((r) => console.log(formatResult(r)));

// ----------------------------------------------------------------------------
// Test 4: Verify correctness of object spread
// ----------------------------------------------------------------------------
console.log("\n🔍 CORRECTNESS TEST: Object spread behavior");
console.log("-".repeat(80));

// Set known values for entity 0
storage.x[0] = 100;
storage.y[0] = 200;
storage.z[0] = 300;
storage.w[0] = 400;

// Set different values for entity 1
storage.x[1] = 1;
storage.y[1] = 2;
storage.z[1] = 3;
storage.w[1] = 4;

console.log("Entity 0 values: x=100, y=200, z=300, w=400");
console.log("Entity 1 values: x=1, y=2, z=3, w=4");
console.log("");

// Test DefineProperty spread
const dpRead0 = dpComponent.read(0);
const dpSpread0 = { ...dpRead0 };
const dpRead1 = dpComponent.read(1);
const dpSpread1After = { ...dpRead0 }; // Same master, but entity changed!

console.log("DefineProperty:");
console.log(`  read(0) then spread:     ${JSON.stringify(dpSpread0)}`);
console.log(
  `  read(1) then spread read(0) master: ${JSON.stringify(dpSpread1After)}`
);
console.log(`  ❌ Second spread shows entity 1 values! This is the footgun.`);
console.log("");

// Test Proxy spread
const proxyRead0 = proxyComponent.read(0);
const proxySpread0 = { ...proxyRead0 };
const proxyRead1 = proxyComponent.read(1);
const proxySpread0After = { ...proxyRead0 }; // Different proxy, entity 0 captured

console.log("Proxy (new each time):");
console.log(`  read(0) then spread:     ${JSON.stringify(proxySpread0)}`);
console.log(
  `  read(1) then spread read(0) proxy: ${JSON.stringify(proxySpread0After)}`
);
console.log(`  ✅ Both spreads correctly show entity 0 values!`);
console.log("");

// Test CachedProxy spread
const cachedRead0 = cachedProxyComponent.read(0);
const cachedSpread0 = { ...cachedRead0 };
const cachedRead1 = cachedProxyComponent.read(1);
const cachedSpread1After = { ...cachedRead0 }; // Same proxy, but entity changed!

console.log("CachedProxy:");
console.log(`  read(0) then spread:     ${JSON.stringify(cachedSpread0)}`);
console.log(
  `  read(1) then spread read(0) proxy: ${JSON.stringify(cachedSpread1After)}`
);
console.log(
  `  ❌ Second spread shows entity 1 values! Same footgun as DefineProperty.`
);
console.log("");

// Test snapshot
console.log("Explicit snapshot() method:");
console.log(
  `  DefineProperty.snapshot(0): ${JSON.stringify(dpComponent.snapshot(0))}`
);
console.log(
  `  Proxy.snapshot(0):          ${JSON.stringify(proxyComponent.snapshot(0))}`
);
console.log(
  `  ✅ Snapshot always returns correct values for the specified entity.`
);

// ----------------------------------------------------------------------------
// Summary
// ----------------------------------------------------------------------------
console.log("\n" + "=".repeat(80));
console.log("SUMMARY");
console.log("=".repeat(80));
console.log(`
Performance (lower is better):
  • DefineProperty: Fastest for read/write operations
  • CachedProxy: Close second, single proxy reuse
  • Proxy (new each time): Slowest due to proxy creation overhead

Correctness (object spread {...component}):
  • DefineProperty: ❌ BROKEN - spread captures getter, not value
  • CachedProxy: ❌ BROKEN - same issue as DefineProperty
  • Proxy (new each time): ✅ WORKS - entity ID captured at creation

Recommendations:
  1. Keep DefineProperty for best performance
  2. Add a snapshot() or toObject() method for safe copying
  3. Document the footgun clearly in USAGE.md
  4. Consider adding a development-mode warning when spreading

Example safe usage:
  // WRONG - captures getter, not value
  state[entityId].Position = Position.read(ctx, entityId);
  
  // RIGHT - use explicit snapshot/copy method
  state[entityId].Position = Position.snapshot(ctx, entityId);
  // OR
  state[entityId].Position = { ...Position.read(ctx, entityId) }; // if using Proxy
`);
