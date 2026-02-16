import { ref } from "vue";
import { Editor } from "@infinitecanvas/core";
import { InfiniteCanvas } from "@infinitecanvas/vue";
const ONLINE_STORAGE_KEY = "infinitecanvas-online-mode";
const savedOnline = localStorage.getItem(ONLINE_STORAGE_KEY);
const initialOnline = savedOnline !== null ? savedOnline === "true" : true;
const isOnline = ref(initialOnline);
let store = null;
function handleReady(_inEditor, inStore) {
    store = inStore;
}
async function toggleOnline() {
    isOnline.value = !isOnline.value;
    localStorage.setItem(ONLINE_STORAGE_KEY, String(isOnline.value));
    if (isOnline.value) {
        await store?.connect();
    }
    else {
        store?.disconnect();
    }
}
const syncOptions = ref({
    persistence: {
        enabled: true,
        documentId: "editor-vue-test",
    },
    history: {
        enabled: true,
    },
    websocket: {
        enabled: true,
        documentId: "editor-vue-test",
        url: "ws://localhost:8087/ws",
        clientId: crypto.randomUUID(),
        startOffline: !isOnline.value,
    },
});
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
;
;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "editor ic-theme-light" },
});
;
;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "online-toggle" },
});
;
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    ...{ onChange: (__VLS_ctx.toggleOnline) },
    type: "checkbox",
    checked: (__VLS_ctx.isOnline),
});
(__VLS_ctx.isOnline ? "Online" : "Offline");
let __VLS_0;
InfiniteCanvas;
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    ...{ 'onReady': {} },
    syncOptions: (__VLS_ctx.syncOptions),
    controls: ({ maxZoom: 3 }),
    grid: ({
        enabled: true,
    }),
    background: ({
        kind: 'dots',
        color: '#f4f4f4',
        strokeColor: '#a1a1a1',
        subdivisionStep: 5,
    }),
}));
const __VLS_2 = __VLS_1({
    ...{ 'onReady': {} },
    syncOptions: (__VLS_ctx.syncOptions),
    controls: ({ maxZoom: 3 }),
    grid: ({
        enabled: true,
    }),
    background: ({
        kind: 'dots',
        color: '#f4f4f4',
        strokeColor: '#a1a1a1',
        subdivisionStep: 5,
    }),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
let __VLS_5;
const __VLS_6 = ({ ready: {} },
    { onReady: (__VLS_ctx.handleReady) });
const { default: __VLS_7 } = __VLS_3.slots;
[toggleOnline, isOnline, isOnline, syncOptions, handleReady,];
var __VLS_3;
var __VLS_4;
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
