import { field, defineComponent, defineSingleton } from "@infinitecanvas/ecs";

export const Velocity = defineComponent("Velocity", {
  x: field.float32(),
  y: field.float32(),
});

export const Position = defineComponent("Position", {
  x: field.float32(),
  y: field.float32(),
});

export const Mouse = defineSingleton("Mouse", {
  x: field.float32().default(10),
  y: field.float32().default(100),
});

// Example: Parent-child relationship with cascade delete
export const Child = defineComponent("Child", {
  parent: field.ref().cascade(), // Delete child when parent is deleted
});

// Example: Friendship relationship (many-to-many via join entity)
export const Friendship = defineComponent("Friendship", {
  personA: field.ref().nullify(), // Set to null if personA is deleted
  personB: field.ref().nullify(), // Set to null if personB is deleted
});

// Example: Order-Product relationship with restrict
export const OrderItem = defineComponent("OrderItem", {
  product: field.ref().restrict(), // Prevent product deletion while order items reference it
  quantity: field.uint16().default(1),
});

// things to think about

// need to have a static ref -> backref mapping
// indexed by refId:
//  refMap: [refComponentId, fieldname, backrefComponentId, backrefFieldName]

// - when a child ref field is set
//  - look up the static mapping to find the backref field
//    const backrefs = refMap[refId]
// this is a problem because I can't acceess the component buffer from another component
//   - maybe I can store the backref mapping in the component definition itself?

// child ref: [parentEntityId, backref]
