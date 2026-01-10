export declare const Position: import("@infinitecanvas/ecs").ComponentDef<{
    x: import("@infinitecanvas/ecs").NumberFieldBuilder<"float32">;
    y: import("@infinitecanvas/ecs").NumberFieldBuilder<"float32">;
    z: import("@infinitecanvas/ecs").NumberFieldBuilder<"float32">;
}>;
export declare const Velocity: import("@infinitecanvas/ecs").ComponentDef<{
    x: import("@infinitecanvas/ecs").NumberFieldBuilder<"float32">;
    y: import("@infinitecanvas/ecs").NumberFieldBuilder<"float32">;
    z: import("@infinitecanvas/ecs").NumberFieldBuilder<"float32">;
}>;
export declare const Acceleration: import("@infinitecanvas/ecs").ComponentDef<{
    x: import("@infinitecanvas/ecs").NumberFieldBuilder<"float32">;
    y: import("@infinitecanvas/ecs").NumberFieldBuilder<"float32">;
    z: import("@infinitecanvas/ecs").NumberFieldBuilder<"float32">;
}>;
export declare const Color: import("@infinitecanvas/ecs").ComponentDef<{
    r: import("@infinitecanvas/ecs").NumberFieldBuilder<"float32">;
    g: import("@infinitecanvas/ecs").NumberFieldBuilder<"float32">;
    b: import("@infinitecanvas/ecs").NumberFieldBuilder<"float32">;
}>;
export declare const DeathTime: import("@infinitecanvas/ecs").ComponentDef<{
    value: import("@infinitecanvas/ecs").NumberFieldBuilder<"float32">;
}>;
export declare const Size: import("@infinitecanvas/ecs").ComponentDef<{
    value: import("@infinitecanvas/ecs").NumberFieldBuilder<"float32">;
}>;
export declare const Attractor: import("@infinitecanvas/ecs").ComponentDef<{
    strength: import("@infinitecanvas/ecs").NumberFieldBuilder<"float32">;
    targetX: import("@infinitecanvas/ecs").NumberFieldBuilder<"float32">;
    targetY: import("@infinitecanvas/ecs").NumberFieldBuilder<"float32">;
    targetZ: import("@infinitecanvas/ecs").NumberFieldBuilder<"float32">;
}>;
export declare const Mouse: import("@infinitecanvas/ecs").SingletonDef<{
    x: import("@infinitecanvas/ecs").NumberFieldBuilder<"float32">;
    y: import("@infinitecanvas/ecs").NumberFieldBuilder<"float32">;
}>;
export declare const Time: import("@infinitecanvas/ecs").SingletonDef<{
    delta: import("@infinitecanvas/ecs").NumberFieldBuilder<"float32">;
    current: import("@infinitecanvas/ecs").NumberFieldBuilder<"float32">;
}>;
export declare const Config: import("@infinitecanvas/ecs").SingletonDef<{
    particlesPerSecond: import("@infinitecanvas/ecs").NumberFieldBuilder<"float32">;
    particleLifetimeSeconds: import("@infinitecanvas/ecs").NumberFieldBuilder<"float32">;
    particleSize: import("@infinitecanvas/ecs").NumberFieldBuilder<"float32">;
}>;
//# sourceMappingURL=components.d.ts.map