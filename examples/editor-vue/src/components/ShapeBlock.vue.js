import { ref, computed } from "vue";
import { Color, Text, VerticalAlign, VerticalAlignment, } from "@infinitecanvas/core";
import { useComponent, useEditorContext, EditableText, } from "@infinitecanvas/vue";
import { Shape } from "../Shape";
const props = defineProps();
const shape = useComponent(props.entityId, Shape);
const color = useComponent(props.entityId, Color);
const verticalAlign = useComponent(props.entityId, VerticalAlign);
const containerRef = ref(null);
const { nextEditorTick } = useEditorContext();
const alignItemsMap = {
    [VerticalAlignment.Top]: "flex-start",
    [VerticalAlignment.Center]: "center",
    [VerticalAlignment.Bottom]: "flex-end",
};
const containerStyle = computed(() => ({
    backgroundColor: `rgb(${color?.value?.red ?? 0}, ${color?.value?.green ?? 0}, ${color?.value?.blue ?? 0})`,
    border: (shape?.value?.border ?? 0) + "px solid black",
    overflow: props.edited ? "visible" : "hidden",
    alignItems: alignItemsMap[verticalAlign.value?.value ?? VerticalAlignment.Top],
}));
function handleEditEnd(data) {
    nextEditorTick((ctx) => {
        const entityId = props.entityId;
        const text = Text.read(ctx, entityId);
        if (text.content === data.content)
            return;
        const writableText = Text.write(ctx, entityId);
        writableText.content = data.content;
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
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ref: "containerRef",
    ...{ class: "shape-block" },
    ...{ style: (__VLS_ctx.containerStyle) },
});
;
let __VLS_0;
EditableText;
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    ...{ 'onEditEnd': {} },
    ...(props),
    blockElement: (__VLS_ctx.containerRef),
}));
const __VLS_2 = __VLS_1({
    ...{ 'onEditEnd': {} },
    ...(props),
    blockElement: (__VLS_ctx.containerRef),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
let __VLS_5;
const __VLS_6 = ({ editEnd: {} },
    { onEditEnd: (__VLS_ctx.handleEditEnd) });
var __VLS_3;
var __VLS_4;
[containerStyle, containerRef, handleEditEnd,];
const __VLS_export = (await import('vue')).defineComponent({
    __typeProps: {},
});
export default {};
