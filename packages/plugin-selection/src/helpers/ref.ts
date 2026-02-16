import { type Context, type EntityId, hasComponent, Synced } from '@infinitecanvas/core'

/** Schema type for ref field detection */
type ComponentSchema = Record<string, { def?: { type?: string } }>

/**
 * Convert ref fields in a component snapshot from EntityId to UUID.
 * Scans the schema for ref fields and replaces their values.
 */
export function convertRefsToUuids(
  ctx: Context,
  schema: ComponentSchema,
  data: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...data }
  for (const [fieldName, fieldBuilder] of Object.entries(schema)) {
    if (fieldBuilder?.def?.type === 'ref') {
      const entityId = data[fieldName] as EntityId | null
      result[fieldName] = getEntityUuid(ctx, entityId)
    }
  }
  return result
}

/**
 * Get the Synced.id (UUID) for an entity, or null if not found.
 */
export function getEntityUuid(ctx: Context, entityId: EntityId | null | undefined): string | null {
  if (entityId == null) return null
  if (!hasComponent(ctx, entityId, Synced)) return null
  return Synced.read(ctx, entityId).id
}

/**
 * Get the names of all ref fields in a component schema.
 */
export function getRefFieldNames(schema: ComponentSchema): string[] {
  const refFields: string[] = []
  for (const [fieldName, fieldBuilder] of Object.entries(schema)) {
    if (fieldBuilder?.def?.type === 'ref') {
      refFields.push(fieldName)
    }
  }
  return refFields
}

/**
 * Resolve ref fields from UUIDs to EntityIds using the provided mapping.
 */
export function resolveRefFields(
  ctx: Context,
  entityId: EntityId,
  componentDef: {
    schema: ComponentSchema
    write: (ctx: Context, entityId: EntityId) => Record<string, unknown>
  },
  componentData: Record<string, unknown>,
  uuidToEntityId: Map<string, EntityId>,
): void {
  const component = componentDef.write(ctx, entityId)
  for (const [fieldName, fieldBuilder] of Object.entries(componentDef.schema)) {
    if (fieldBuilder?.def?.type === 'ref') {
      const uuid = componentData[fieldName] as string | null | undefined
      if (uuid != null) {
        component[fieldName] = uuidToEntityId.get(uuid) ?? null
      }
    }
  }
}
