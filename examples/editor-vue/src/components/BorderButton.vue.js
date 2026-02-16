import { computed } from "vue";
import { MenuDropdown, useComponents, useEditorContext, } from "@infinitecanvas/vue";
import { Shape } from "../Shape";
const props = defineProps();
const { nextEditorTick } = useEditorContext();
const shapesMap = useComponents(() => props.entityIds, Shape);
const currentBorder = computed(() => {
    const first = shapesMap.value.values().next().value;
    if (!first)
        return 5;
    return first.border;
});
const hasMultipleBorders = computed(() => {
    const values = new Set();
    for (const shape of shapesMap.value.values()) {
        if (shape) {
            values.add(shape.border);
        }
    }
    return values.size > 1;
});
function handleBorderChange(event) {
    const target = event.target;
    const newBorder = parseInt(target.value, 10);
    nextEditorTick((ctx) => {
        for (const entityId of props.entityIds) {
            const shape = Shape.write(ctx, entityId);
            shape.border = newBorder;
        }
    });
}
const __VLS_ctx = {
    ...{},
    ...{},
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
;
;
let __VLS_0;
MenuDropdown;
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    title: "Border",
}));
const __VLS_2 = __VLS_1({
    title: "Border",
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
var __VLS_5 = {};
const { default: __VLS_6 } = __VLS_3.slots;
{
    const { button: __VLS_7 } = __VLS_3.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border-button" },
    });
    ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
        ...{ class: "border-icon" },
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        'stroke-width': "2",
    });
    ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.rect)({
        x: "3",
        y: "3",
        width: "18",
        height: "18",
        rx: "2",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "border-value" },
    });
    ;
    (__VLS_ctx.hasMultipleBorders ? "–" : __VLS_ctx.currentBorder);
    [hasMultipleBorders, currentBorder,];
}
{
    const { dropdown: __VLS_8 } = __VLS_3.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border-dropdown" },
    });
    ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border-label" },
    });
    ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border-slider-row" },
    });
    ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        ...{ onInput: (__VLS_ctx.handleBorderChange) },
        type: "range",
        min: "0",
        max: "20",
        value: (__VLS_ctx.currentBorder),
        ...{ class: "border-slider" },
    });
    ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "border-display" },
    });
    ;
    (__VLS_ctx.currentBorder);
    [currentBorder, currentBorder, handleBorderChange,];
}
[];
var __VLS_3;
[];
const __VLS_export = (await import('vue')).defineComponent({
    __typeProps: {},
});
export default {};
