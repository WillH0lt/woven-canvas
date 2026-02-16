import { VerticalAlignment, TextAlignment } from "@infinitecanvas/core";
import { ToolbarButton } from "@infinitecanvas/vue";
const snapshot = JSON.stringify({
    block: {
        tag: "shape",
        size: [200, 150],
    },
    shape: { border: 5 },
    color: {
        red: 74,
        green: 144,
        blue: 217,
    },
    text: {
        defaultAlignment: TextAlignment.Center,
    },
    verticalAlign: {
        value: VerticalAlignment.Center,
    },
});
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
let __VLS_0;
ToolbarButton;
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    name: "shape",
    tooltip: "Shape",
    dragOutSnapshot: (__VLS_ctx.snapshot),
    placementSnapshot: (__VLS_ctx.snapshot),
}));
const __VLS_2 = __VLS_1({
    name: "shape",
    tooltip: "Shape",
    dragOutSnapshot: (__VLS_ctx.snapshot),
    placementSnapshot: (__VLS_ctx.snapshot),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
var __VLS_5 = {};
const { default: __VLS_6 } = __VLS_3.slots;
__VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
    viewBox: "0 0 20 20",
    fill: "none",
    stroke: "currentColor",
    'stroke-width': "1.5",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.rect)({
    x: "3",
    y: "3",
    width: "14",
    height: "14",
    rx: "2",
});
[snapshot, snapshot,];
var __VLS_3;
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
