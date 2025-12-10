# Query Options

The ECS framework now supports flexible partitioning control through QueryOptions at both query definition time and runtime.

## Overview

- **Query Creation Options**: Configure default behavior when creating a query with `useQuery()`
- **Runtime Query Options**: Override behavior when calling query methods like `current()`, `added()`, etc.

## Query Creation Options

When defining a query with `useQuery()`, you can specify default partitioning behavior:

```typescript
import { useQuery, type QueryCreationOptions } from "@infinitecanvas/ecs";

// Default behavior - partitioning enabled by default
const defaultQuery = useQuery((q) => q.with(Position, Velocity));

// Explicitly enable partitioning by default
const partitionedQuery = useQuery((q) => q.with(Position, Velocity), {
  partition: true,
});

// Disable partitioning by default
const unpartitionedQuery = useQuery((q) => q.with(SingletonComponent), {
  partition: false,
});
```

### `QueryCreationOptions`

```typescript
interface QueryCreationOptions {
  /** Default partitioning behavior for this query. Can be overridden at runtime with QueryOptions */
  partition?: boolean;
}
```

- `partition?: boolean` - Sets the default partitioning behavior for the query
  - `true` (default): Partition results across workers when `ctx.threadCount > 1`
  - `false`: Never partition results, return all entities to all workers

## Runtime Query Options

When calling query methods, you can override the default partitioning behavior:

```typescript
import { type QueryOptions } from "@infinitecanvas/ecs";

function execute(ctx: Context) {
  // Use default partitioning behavior (set during query creation)
  const entities = myQuery.current(ctx);

  // Force partitioning on (if multiple threads)
  const partitionedEntities = myQuery.current(ctx, { partitioned: true });

  // Force partitioning off (get all entities regardless of thread count)
  const allEntities = myQuery.current(ctx, { partitioned: false });
}
```

### `QueryOptions`

```typescript
interface QueryOptions {
  /** Whether to partition results across workers. If not specified, uses default partitioning behavior */
  partitioned?: boolean;
}
```

- `partitioned?: boolean` - Runtime override for partitioning behavior
  - `undefined`: Use the query's default partition behavior
  - `true`: Partition results if `ctx.threadCount > 1`
  - `false`: Return all results regardless of thread count

## Partitioning Logic

The partitioning decision follows this priority:

1. **Runtime Override**: If `options.partitioned` is specified, use that value
2. **Default Behavior**: Use the query's default partition setting (from `useQuery`)
3. **Framework Default**: If no default was set, partition when `ctx.threadCount > 1`

Partitioning only occurs when:

- The partition decision is `true` AND
- `ctx.threadCount > 1` (multiple worker threads exist)

## Use Cases

### Worker-Specific Processing

```typescript
// Each worker processes only its assigned entities
const particles = useQuery((q) => q.with(Position, Velocity), {
  partition: true,
});

function physics(ctx: Context) {
  // Each worker gets different entities: [1,3,5] vs [2,4,6]
  for (const eid of particles.current(ctx)) {
    // Process assigned entities only
  }
}
```

### Global Coordination

```typescript
// All workers need to see all entities for coordination
const attractors = useQuery((q) => q.with(Attractor), { partition: false });

function applyForces(ctx: Context) {
  // All workers see all attractors: [1,2,3]
  const allAttractors = attractors.current(ctx);

  // But only process assigned particles
  for (const pid of particles.current(ctx, { partitioned: true })) {
    // Apply forces from all attractors to assigned particles
  }
}
```

### Conditional Partitioning

```typescript
function dynamicProcessing(ctx: Context) {
  if (expensiveOperation) {
    // Distribute work across threads
    const entities = query.current(ctx, { partitioned: true });
  } else {
    // Process everything on each thread for consistency
    const entities = query.current(ctx, { partitioned: false });
  }
}
```

## Migration Guide

Existing code continues to work without changes:

```typescript
// Old code - still works, uses default partitioning
const query = useQuery((q) => q.with(Position));
const entities = query.current(ctx); // Partitioned by default

// New options are additive
const newQuery = useQuery((q) => q.with(Position), { partition: false });
const entities2 = newQuery.current(ctx, { partitioned: true }); // Override at runtime
```
