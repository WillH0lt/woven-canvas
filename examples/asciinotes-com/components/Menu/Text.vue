<template>
  <StudioOverlay v-if="studioStore.sideMenuKind === SideMenuKind.None">
    <MenuLink
      v-if="linkInputVisible"
      v-model:link="linkModel"
      v-model:linkClass="linkClassModel"
      @hide="linkInputVisible = false"
    />
    <div
      ref="container"
      class="flex items-center justify-center h-10 bg-gray-700 text-white pointer-events-auto cursor-auto drop-shadow-md rounded-l-xl [&>*:first-child]:rounded-l-xl [&>*:first-child]:[&>*:first-child]:ml-1 rounded-r-xl [&>*:last-child]:rounded-r-xl [&>*:last-child]:[&>*:last-child]:mr-1"
      v-else
    >
      <MenuColorButton
        ref="colorButtonRef"
        :color="color"
        data-tooltip="Color"
        @click="colorMenuVisible = !colorMenuVisible"
      />
      <MenuDivider />
      <MenuDropdownButton
        ref="fontFamilyButtonRef"
        data-tooltip="Font Family"
        @click="fontFamilyMenuVisible = !fontFamilyMenuVisible"
        :label="fontFamily"
      />
      <MenuDivider />
      <MenuDropdownButton
        ref="fontSizeButtonRef"
        data-tooltip="Font Size"
        @click="fontSizeMenuVisible = !fontSizeMenuVisible"
        :label="getFontSizeLabel(fontSize)"
      />
      <MenuDivider />
      <MenuButton data-tooltip="Bold" :active="bold" @click="bold = !bold">
        <SvgoBold class="w-4" />
      </MenuButton>
      <MenuButton data-tooltip="Italics" :active="italics" @click="italics = !italics">
        <SvgoItalic class="w-4" />
      </MenuButton>
      <MenuButton data-tooltip="Underline" :active="underline" @click="underline = !underline">
        <SvgoUnderline class="w-4" />
      </MenuButton>
      <template v-if="studioStore.selectedPart?.tag !== PartTag.Button">
        <MenuButton
          data-tooltip="Add Hyperlink"
          :active="linkModel !== ''"
          @click="linkInputVisible = true"
        >
          <SvgoLink class="w-4" />
        </MenuButton>
        <MenuDivider />
        <MenuButton data-tooltip="Alignment" @click="setNextAlignment()">
          <SvgoAlignLeft v-if="alignment === Alignment.Left" class="w-4" />
          <SvgoAlignCenter v-else-if="alignment === Alignment.Center" class="w-4" />
          <SvgoAlignRight v-else-if="alignment === Alignment.Right" class="w-4" />
          <SvgoAlignJustify v-else class="w-4" />
        </MenuButton>
      </template>
    </div>
    <div ref="colorMenuRef" :style="colorMenuStyles">
      <MenuColor
        class="w-32"
        v-if="colorMenuVisible"
        v-model="color"
        @blur="colorMenuVisible = false"
      />
    </div>
    <div ref="fontFamilyMenuRef" :style="fontFamilyMenuStyles">
      <MenuFontFamily
        class="w-52"
        v-if="fontFamilyMenuVisible"
        v-model="fontFamily"
        @blur="fontFamilyMenuVisible = false"
      />
    </div>
    <div ref="fontSizeMenuRef" :style="fontSizeMenuStyles">
      <MenuFontSize
        class="w-32"
        v-if="fontSizeMenuVisible"
        v-model="fontSize"
        @blur="fontSizeMenuVisible = false"
      />
    </div>
  </StudioOverlay>
</template>
<script setup lang="ts">
import { PartTag } from '@prisma/client';

import { SideMenuKind } from '@/types';
import { FONT_SIZE_OPTIONS } from '@/constants';
import { Alignment } from '@/types';

const studioStore = useStudioStore();

const color = defineModel<string>('color', { required: true });
const fontSize = defineModel<number>('fontSize', { required: true });
const fontFamily = defineModel<string>('fontFamily', { required: true });
const bold = defineModel<boolean>('bold', { required: true });
const italics = defineModel<boolean>('italics', { required: true });
const underline = defineModel<boolean>('underline', { required: true });
const alignment = defineModel<Alignment>('alignment', { required: true });
const linkModel = defineModel<string>('link', { required: true });
const linkClassModel = defineModel<string>('linkClass', { required: true });

const containerRef = useTemplateRef('container');

const colorMenuVisible = ref(false);
const colorButtonRef = ref<HTMLElement | null>(null);
const colorMenuRef = ref<HTMLElement | null>(null);
const { floatingStyles: colorMenuStyles } = useMenus(colorButtonRef, colorMenuRef, {
  offset: 2,
  placement: 'top',
});

const fontFamilyMenuVisible = ref(false);
const fontFamilyButtonRef = ref<HTMLElement | null>(null);
const fontFamilyMenuRef = ref<HTMLElement | null>(null);
const { floatingStyles: fontFamilyMenuStyles } = useMenus(fontFamilyButtonRef, fontFamilyMenuRef, {
  offset: 2,
  placement: 'top',
});

const fontSizeMenuVisible = ref(false);
const fontSizeButtonRef = ref<HTMLElement | null>(null);
const fontSizeMenuRef = ref<HTMLElement | null>(null);
const { floatingStyles: fontSizeMenuStyles } = useMenus(fontSizeButtonRef, fontSizeMenuRef, {
  offset: 2,
  placement: 'top',
});

useTooltips(containerRef, 'top');

const alignments = [Alignment.Left, Alignment.Center, Alignment.Right, Alignment.Justify];

function setNextAlignment() {
  const nextAlignment = alignments[(alignments.indexOf(alignment.value) + 1) % alignments.length];
  alignment.value = nextAlignment;
}

function getFontSizeLabel(fontSize: number): string {
  const option = FONT_SIZE_OPTIONS.find((option) => option.value === fontSize);
  return option ? option.label : `${+fontSize.toFixed(1)} px`;
}

const linkInputVisible = ref(false);
</script>
