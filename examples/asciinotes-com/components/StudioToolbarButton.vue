<template>
  <div class="h-full flex gap-4 justify-center items-center px-4 border-l border-x-gray-400">
    <div class="w-20 h-10 text-white">
      <PartButton
        class="relative"
        :part="
          {
            ...DEFAULTS,
            backgroundColor,
            buttonKind: toolbarButton,
          } as Part
        "
        :style="{
          backgroundColor,
        }"
        @click="select(toolbarButton)"
      >
        <p>Button</p>
      </PartButton>
    </div>

    <div
      class="flex items-center justify-center border-2 rounded h-8 w-8 border-black cursor-pointer hover:bg-gray-200 transition-colors"
      @click="buttonsVisible = !buttonsVisible"
    >
      <svgoPlus class="w-4 h-4" />
    </div>
  </div>

  <Teleport to="body" v-if="buttonsVisible">
    <StudioOverlay>
      <div
        class="absolute bottom-24 left-1/2 -translate-x-1/2 w-96 bg-gray-300 border border-black rounded-t-lg overflow-x-hidden z-50"
        v-on-click-outside="() => (buttonsVisible = false)"
        @click.stop
        @wheel.stop
      >
        <div class="p-4 h-64">
          <div class="grid grid-cols-2 gap-4 w-full h-full">
            <div v-for="button in buttons" :key="button" class="w-32 h-10 text-white">
              <PartButton
                class="relative"
                :part="
                  {
                    ...DEFAULTS,
                    backgroundColor,
                    buttonKind: button,
                  } as Part
                "
                :style="{
                  backgroundColor,
                }"
                @click="select(button)"
              >
                <p>Button</p>
              </PartButton>
            </div>
          </div>
        </div>
      </div>
    </StudioOverlay>
  </Teleport>
</template>

<script setup lang="ts">
import { vOnClickOutside } from '@vueuse/components';
import { PartTag, ButtonKind } from '@prisma/client';
import type { Part } from '@prisma/client';

const emit = defineEmits<{
  (e: 'select', part: Partial<Part>): void;
}>();

const backgroundColor = ref('#6a58f2');

const buttonsVisible = ref(false);

const DEFAULTS: Partial<Part> = {
  tag: PartTag.Button,
  backgroundColor: backgroundColor.value,
  width: 200,
  height: 60,
  innerHtml: '<p><span style="color: #ffffff">Button</span></p>',
};

const toolbarButton = ref<ButtonKind>(ButtonKind.Rounded);

const buttons = [
  ButtonKind.Standard,
  ButtonKind.Rounded,
  ButtonKind.Pill,
  ButtonKind.Block,
  ButtonKind.Realistic,
  ButtonKind.Offset,
];

function select(buttonKind: ButtonKind) {
  toolbarButton.value = buttonKind;

  buttonsVisible.value = false;

  emit('select', {
    ...DEFAULTS,
    backgroundColor: backgroundColor.value,
    buttonKind,
  });
}
</script>
