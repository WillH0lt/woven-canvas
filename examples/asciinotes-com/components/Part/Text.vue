<template>
  <div ref="componentRef">
    <div
      class="w-full h-full"
      :class="{
        hovered: hovered,
        selected: selected,
        dragged: dragged,
        '!outline-none': typed && !part.stretched,
        'relative w-fit whitespace-nowrap': !part.stretched,
      }"
      :style="{
        fontFamily: part.fontFamily,
      }"
      @keydown.stop
    >
      <div ref="textContainerRef" class="leading-snug">
        <editor-content
          v-if="typed && editor"
          class="!outline-none pointer-events-auto cursor-text"
          :class="{
            '[&>*]:!whitespace-nowrap': !part.stretched,
            '[&>*]:!whitespace-pre-wrap': part.stretched,
          }"
          :editor="editor"
        />
        <div
          v-else
          class="!outline-none tiptap ProseMirror"
          :class="{
            '!whitespace-nowrap': !part.stretched,
            '!whitespace-pre-wrap': part.stretched,
          }"
        >
          <slot></slot>
        </div>
      </div>
      <Teleport to="body">
        <div ref="menu" v-if="edited" :style="floatingStyles">
          <MenuPart />
        </div>
        <div ref="typedMenu" v-if="typed" :style="typedFloatingStyles">
          <MenuText
            v-model:color="color"
            @update:color="setColor"
            v-model:bold="bold"
            @update:bold="setBold"
            v-model:italics="italics"
            @update:italics="setItalics"
            v-model:underline="underline"
            @update:underline="setUnderline"
            v-model:alignment="alignment"
            @update:alignment="setAlignment"
            v-model:fontSize="fontSize"
            @update:fontSize="setFontSize"
            v-model:fontFamily="part.fontFamily"
            @update:fontFamily="setFontFamily"
            v-model:link="link"
            @update:link="setLink"
            v-model:linkClass="linkClass"
            @update:linkClass="setLinkClass"
          />
        </div>
      </Teleport>
    </div>
  </div>
</template>

<script setup lang="ts">
import { OnBlurHighlight } from '~/tiptapExtensions/onBlurHighlight';
import { EditorContent, Editor } from '@tiptap/vue-3';
import Bold from '@tiptap/extension-bold';
import Color from '@tiptap/extension-color';
import Document from '@tiptap/extension-document';
import History from '@tiptap/extension-history';
import Italic from '@tiptap/extension-italic';
import Link from '@tiptap/extension-link';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import { PartTag } from '@prisma/client';
import type { Part } from '@prisma/client';

import { Alignment } from '@/types';

const props = defineProps<{
  part: Readonly<Part>;
  hovered?: boolean;
  dragged?: boolean;
  selected?: boolean;
  edited?: boolean;
  typed?: boolean;
  singleLine?: boolean;
}>();

const textContainerRef = useTemplateRef('textContainerRef');
const studioStore = useStudioStore();
const pointer = usePointer();
const menuRef = useTemplateRef('menu');
const typedMenuRef = useTemplateRef('typedMenu');
const componentRef = useTemplateRef('componentRef');

const { floatingStyles } = useMenus(textContainerRef, menuRef, { placement: 'top' });
const { floatingStyles: typedFloatingStyles } = useMenus(textContainerRef, typedMenuRef, {
  placement: 'top',
});

let editor: Editor | null = null;

interface LinkAttributes {
  href: string;
  target: string;
  class: string;
}

onMounted(() => {
  const resizeObserver = new ResizeObserver(() => {
    if (!textContainerRef.value) return;
    if (props.part.tag !== PartTag.Text) return;
    if (props.typed && textContainerRef.value.offsetWidth < props.part.width) return;

    // this is here to prevent a kind of oscillating update between vue and studio
    if (
      props.part.width === textContainerRef.value.offsetWidth &&
      props.part.height === textContainerRef.value.offsetHeight
    )
      return;

    // console.log('resize observer', props.part.innerHtml);
    studioStore.updatePartInStudioNosnapshot({
      ...props.part,
      width: textContainerRef.value.offsetWidth,
      height: textContainerRef.value.offsetHeight,
      innerHtml: editor?.getHTML() ?? props.part.innerHtml,
    });
  });

  resizeObserver.observe(textContainerRef.value!);
});

onUnmounted(() => {
  if (editor) {
    editor.destroy();
    editor = null;
  }
});

watch(
  () => props.typed,
  (value: boolean) => {
    if (value) {
      initializeEditor();
    } else if (editor) {
      editor.destroy();
      editor = null;

      if (componentRef.value) {
        componentRef.value.scrollLeft = 0;
      }
    }
  },
  { immediate: true },
);

async function initializeEditor() {
  if (editor) return;

  editor = new Editor({
    content: props.part.innerHtml,
    extensions: [
      Document.extend({
        content: props.singleLine ? 'block' : undefined,
      }),
      Paragraph.extend({
        addAttributes() {
          if (props.singleLine) {
            return { class: { default: 'singleLine' } };
          }
          return {};
        },
      }),
      Text,
      Link.configure({
        openOnClick: false,
        defaultProtocol: 'https',
        HTMLAttributes: {
          rel: null,
        },
      }),
      TextStyle,
      Bold,
      Italic,
      Underline,
      Color,
      TextAlign.configure({
        types: ['paragraph'],
        alignments: ['left', 'center', 'right', 'justify'],
        defaultAlignment: 'left',
      }),
      OnBlurHighlight,
      History,
    ],
  });

  editor.on('selectionUpdate', syncTypedMenu);

  editor.on('update', updatePart);

  // wait for editor view to mount and pointerenter event to be called
  await new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve();
    }, 100);
  });

  const position = editor.view.posAtCoords({
    left: pointer.x.value,
    top: pointer.y.value,
  });

  editor
    .chain()
    .focus()
    .setTextSelection(position?.pos ?? 0)
    .run();
}

const color = ref('#000000');
function setColor(color: string): void {
  if (!editor) return;

  const { from, to } = editor.state.selection;

  if (from === to) {
    editor.chain().focus().selectAll().setColor(color).setTextSelection(to).run();
  } else {
    editor.chain().focus().setColor(color).run();
  }

  syncTypedMenu();
  updatePart();
}

// const fontFamily = computed(() => props.part.fontFamily);
async function setFontFamily(family: string): Promise<void> {
  studioStore.updatePartInStudioNosnapshot({
    ...props.part,
    fontFamily: family,
  });

  // await new Promise<void>((resolve) => {
  //   setTimeout(() => {
  //     resolve();
  //   }, 350);
  // });

  // studioStore.deselectAll();
}

const fontSize = computed(() => props.part.fontSize);
async function setFontSize(newFontSize: number): Promise<void> {
  const oldFontSize = props.part.fontSize;

  const width = (newFontSize / oldFontSize) * props.part.width;
  const height = (newFontSize / oldFontSize) * props.part.height;
  const left = props.part.left + (props.part.width / 2 - width / 2);

  studioStore.updatePartInStudioNosnapshot({
    ...props.part,
    fontSize: newFontSize,
    width,
    height,
    left,
  });

  await new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve();
    }, 250);
  });

  studioStore.deselectAll();
}

const bold = ref(false);
function setBold(): void {
  editor?.chain().focus().toggleBold().run();
  syncTypedMenu();
  updatePart();
}

const italics = ref(false);
function setItalics(): void {
  editor?.chain().focus().toggleItalic().run();
  syncTypedMenu();
  updatePart();
}

const underline = ref(false);
function setUnderline(): void {
  editor?.chain().focus().toggleUnderline().run();
  syncTypedMenu();
  updatePart();
}

const alignment = ref<Alignment>(Alignment.Left);
function setAlignment(alignment: Alignment): void {
  editor?.chain().focus().setTextAlign(alignment).run();
  syncTypedMenu();
  updatePart();
}

const link = ref<string>('');
async function setLink(href: string): Promise<void> {
  if (!editor) return;

  let link = editor.getAttributes('link') as LinkAttributes | undefined;

  if (!link?.class) {
    const defaultLinkStyle = studioStore.linkStyles.find((style) => style.isDefault);

    link = {
      href: '',
      target: '',
      class: defaultLinkStyle?.className ?? '',
    };
  }

  link = {
    ...link,
    href: href,
    target: href.startsWith('/') ? '_self' : '_blank',
  };

  const { from, to } = editor.state.selection;

  if (from === to) {
    if (editor.isActive('link')) {
      if (href === '') {
        editor.chain().focus().unsetLink().run();
      } else {
        editor.chain().selectParentNode().setLink(link).run();
      }
    } else {
      editor.chain().insertContentAt(from, link).run();

      editor
        .chain()
        .focus()
        .setTextSelection({ from: from, to: from + href.length })
        .setLink(link)
        .run();
    }
  } else {
    if (href === '') {
      editor.chain().focus().unsetLink().run();
    } else {
      editor.chain().focus().setLink(link).run();
    }
  }

  // set cursor to end of link
  editor.chain().focus().setTextSelection(to).run();

  // the editor update already updated the text, wait for the next tick to add the link
  await studioStore.nextTick();
  await studioStore.nextTick();

  syncTypedMenu();
  updatePart();
}

const linkClass = ref('');
function setLinkClass(linkClass: string): void {
  if (!editor) return;

  const link = editor.getAttributes('link') as LinkAttributes | undefined;
  if (!link) return;

  const { from, to } = editor.state.selection;

  if (from === to) {
    editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({ ...link, class: linkClass })
      .run();
  } else {
    editor
      .chain()
      .focus()
      .setLink({ ...link, class: linkClass })
      .run();
  }
}

function syncTypedMenu(): void {
  if (!editor) return;

  color.value = editor.getAttributes('textStyle').color ?? '#000000';
  bold.value = editor.isActive('bold');
  italics.value = editor.isActive('italic');
  underline.value = editor.isActive('underline');

  const alignments = [Alignment.Left, Alignment.Center, Alignment.Right, Alignment.Justify];
  const currentAlignment = alignments.find((alignment) =>
    editor?.isActive({ textAlign: alignment }),
  );
  alignment.value = currentAlignment ?? Alignment.Left;

  if (editor.isActive('link')) {
    link.value = editor.getAttributes('link')?.href ?? '';
  } else {
    link.value = '';
  }
}

async function updatePart() {
  if (!textContainerRef.value || !componentRef.value || !editor) return;

  // Get the actual editor DOM element
  const editorDOM = editor.view.dom;

  // For accurate width in nowrap mode, we need to check all content
  let maxWidth = 0;

  if (!props.part.stretched) {
    // In nowrap mode, we need to measure each paragraph/block
    const blocks = editorDOM.querySelectorAll('p, h1, h2, h3, h4, h5, h6, div');
    blocks.forEach((block) => {
      // Get the actual scroll width without wrapping
      const originalWhitespace = block.style.whiteSpace;
      block.style.whiteSpace = 'nowrap';
      maxWidth = Math.max(maxWidth, block.scrollWidth);
      block.style.whiteSpace = originalWhitespace;
    });
  } else {
    // In stretched mode, the editor width constrains the content
    maxWidth = editorDOM.scrollWidth;
  }

  let height = textContainerRef.value.offsetHeight;
  let width = Math.max(maxWidth, props.part.width);
  let stretched = props.part.stretched;

  // Special case handling for different part types
  if (props.part.tag === PartTag.Note) {
    const padding = props.part.width * 0.16;
    width = props.part.width;
    height = Math.max(props.part.width, height + padding);
  } else if (props.part.tag === PartTag.Button) {
    width = props.part.width;
    height = props.part.height;
  }

  // Auto-stretch handling for long content
  if (!stretched && maxWidth > props.part.width + 500) {
    stretched = true;
    width = props.part.width + 500;

    // Schedule another update after layout changes to recalculate with new stretched state
    setTimeout(async () => {
      await studioStore.nextTick();
      await studioStore.nextTick();
      await nextTick();
      await nextTick();
      updatePart();
    }, 10);
  }

  studioStore.updatePartInStudioNosnapshot({
    ...props.part,
    height,
    width,
    stretched,
    innerHtml: editor.getHTML(),
  });

  // if (!textContainerRef.value || !componentRef.value || !editor) return;

  // let height = textContainerRef.value.offsetHeight;
  // let width = Math.max(editor.view.dom.clientWidth, props.part.width);
  // // let width = Math.max(textContainerRef.value.offsetWidth, props.part.width);
  // let stretched = props.part.stretched;

  // if (props.part.tag === PartTag.Note) {
  //   const padding = props.part.width * 0.16;
  //   width = props.part.width;
  //   height = Math.max(props.part.width, height + padding);
  // } else if (props.part.tag === PartTag.Button) {
  //   // const padding = props.part.width * 0.16;
  //   // width = Math.max(props.part.width, width + padding);
  //   width = props.part.width;
  //   height = props.part.height;
  // }

  // // if pasting in a long piece of text it should autowrap
  // if (!stretched && editor.view.dom.clientWidth > props.part.width + 500) {
  //   stretched = true;
  //   width = props.part.width + 500;

  //   // call update again after a short delay to allow the text to wrap
  //   setTimeout(async () => {
  //     await studioStore.nextTick();
  //     await studioStore.nextTick();
  //     await nextTick();
  //     await nextTick();
  //     updatePart();
  //   }, 10);
  // }

  // studioStore.updatePartInStudioNosnapshot({
  //   ...props.part,
  //   height,
  //   width,
  //   stretched,
  //   innerHtml: editor.getHTML(),
  // });
}
</script>

<style>
.ProseMirror-focused {
  outline: none;
}

.tiptap {
  line-height: 1.375;
  word-wrap: break-word;
  text-wrap: wrap;
  /* display: inline-block; */
  word-break: break-word;
}

.tiptap p:empty::before {
  content: '';
  display: block;
  height: 1.375em;
}

.blur-highlight {
  background-color: var(--color-primary-light);
}

.singleLine {
  white-space: nowrap;
  overflow: hidden;
  padding: 16px 8px;
}

.singleLine br {
  display: none;
}

.singleLine * {
  display: inline !important;
  white-space: nowrap !important;
}
</style>
