import { BaseSystem } from "@infinitecanvas/core";
import {
  Block,
  Color,
  Edited,
  Selected,
  Text,
} from "@infinitecanvas/core/components";
import { type Entity, co } from "@lastolivegames/becsy";
import figlet from "figlet";
import type { Mesh } from "three";

import { removeElement, showElement } from "../helpers/element";
import { resizeAndMaybeRecreateLetterMaterial } from "../helpers/materialHelper";
import { getLines } from "../helpers/textLayoutCalculator";
import type { LetterMaterial } from "../materials";
import type { AsciiResources } from "../types";
import { RenderScene } from "./RenderScene";
import { RenderShapes } from "./RenderShapes";

export class RenderText extends BaseSystem {
  protected declare readonly resources: AsciiResources;

  private readonly texts = this.query(
    (q) => q.added.addedOrChanged.current.with(Text).trackWrites
  );

  private readonly textBlocks = this.query((q) =>
    q.changed.with(Block).trackWrites.and.with(Text)
  );

  private readonly selectedTexts = this.query((q) =>
    q.added.removed.with(Text, Block, Selected)
  );

  private readonly editedTexts = this.query((q) =>
    q.added.removed.with(Text, Block, Edited)
  );

  public constructor() {
    super();
    this.schedule((s) => s.inAnyOrderWith(RenderShapes).before(RenderScene));
  }

  private getTextLines(textEntity: Entity, element: HTMLElement): string[] {
    const { fontFamily } = textEntity.read(Text);

    const textContainer = element?.shadowRoot
      ?.firstElementChild as HTMLElement | null;
    if (!textContainer) return [];

    const lines = getLines(textContainer)
      .map((line) => line.text)
      .flatMap((line) => {
        if (fontFamily === "CascadiaMono") {
          return [line];
        }

        return figlet
          .textSync(line, {
            font: fontFamily,
            horizontalLayout: "full",
            verticalLayout: "full",
          })
          .split("\n");
      });

    return lines;
  }

  private updateMaterial(mesh: Mesh, lines: string[]): void {
    const width = mesh.scale.x;
    const height = mesh.scale.y;

    const rows = Math.round(height / this.grid.rowHeight);
    const cols = Math.round(width / this.grid.colWidth);

    resizeAndMaybeRecreateLetterMaterial(mesh, rows, cols);

    const material = mesh.material as LetterMaterial;

    material.colors.value.image.data.fill(0);

    const black = new Color({
      red: 0,
      green: 0,
      blue: 0,
      alpha: 255,
    });

    const invisible = new Color({
      red: 0,
      green: 0,
      blue: 0,
      alpha: 0,
    });

    // Fill the grid with characters from the split lines
    for (let row = 0; row < Math.min(rows, lines.length); row++) {
      const line = lines[row];

      for (let col = 0; col < Math.min(cols, line.length); col++) {
        const c = line[col];
        material.setCharAtPosition(c, row, col);
        if (c === " ") {
          material.setColorAtPosition(invisible, row, col);
        } else {
          material.setColorAtPosition(black, row, col);
        }
      }
    }
  }

  @co private *cleanupTextElement(
    textEntity: Entity,
    blockId: string
  ): Generator {
    if (!textEntity.alive) {
      // remove element immediately
      removeElement(blockId);
      return;
    }

    if (textEntity.has(Edited) || textEntity.has(Selected)) return;

    co.scope(textEntity);
    co.cancelIfCoroutineStarted();

    yield co.waitForFrames(5);

    removeElement(blockId);
  }

  private async updateText(textEntity: Entity): Promise<void> {
    const block = textEntity.read(Block);

    const mesh = this.resources.scene.getObjectByName(block.id) as
      | Mesh
      | undefined;
    if (!mesh) return;

    const element = await showElement(textEntity, this.resources, {});

    const lines = this.getTextLines(textEntity, element);

    this.updateMaterial(mesh, lines);
  }

  private updateTextSync(textEntity: Entity): void {
    const { id } = textEntity.read(Block);

    const mesh = this.resources.scene.getObjectByName(id) as Mesh | undefined;
    if (!mesh) return;

    const element = document.getElementById(id) as HTMLElement | null;
    if (!element) return;

    const lines = this.getTextLines(textEntity, element);

    this.updateMaterial(mesh, lines);
  }

  public execute(): void {
    for (const textEntity of this.selectedTexts.added) {
      showElement(textEntity, this.resources, { opacity: 0 });
    }

    for (const textEntity of this.editedTexts.added) {
      const { id } = textEntity.read(Block);

      const element = document.getElementById(id) as HTMLElement | null;
      if (!element) return;

      element.style.opacity = "1";
    }

    if (this.selectedTexts.removed.length > 0) {
      this.accessRecentlyDeletedData();
    }
    for (const textEntity of this.selectedTexts.removed) {
      const block = textEntity.read(Block);

      this.cleanupTextElement(textEntity, block.id);
    }

    for (const textEntity of this.textBlocks.changed) {
      // if just the block is changeing we can do a sync update
      this.updateTextSync(textEntity);
    }

    for (const textEntity of this.texts.addedOrChanged) {
      if (textEntity.has(Edited)) continue;

      // if the text is also changing we need to wait for the element to update
      const { id } = textEntity.read(Block);
      this.updateText(textEntity);
      this.cleanupTextElement(textEntity, id);
    }
  }
}

// =============================================================================================

// import { BaseSystem } from '@infinitecanvas/core'
// import { Block, Color, Edited, Opacity, Text } from '@infinitecanvas/core/components'
// import type { Entity } from '@lastolivegames/becsy'
// import figlet from 'figlet'
// import type { ICEditableBlock } from 'packages/core/src/webComponents'
// import type { Mesh } from 'three'

// import { resizeAndMaybeRecreateLetterMaterial } from '../helpers/materialHelper'
// import { getLines } from '../helpers/textLayoutCalculator'
// import type { LetterMaterial } from '../materials'
// import type { AsciiResources } from '../types'
// import { RenderScene } from './RenderScene'
// import { RenderShapes } from './RenderShapes'

// export class RenderText extends BaseSystem {
//   protected declare readonly resources: AsciiResources

//   private readonly texts = this.query((q) => q.added.changed.current.with(Text, Block).trackWrites)

//   private readonly editedTexts = this.query((q) => q.added.removed.with(Text, Block, Edited).using(Opacity).write)

//   public constructor() {
//     super()
//     this.schedule((s) => s.inAnyOrderWith(RenderShapes).before(RenderScene))
//   }

//   private getTextLines(textEntity: Entity, element: HTMLElement): string[] {
//     const { fontFamily } = textEntity.read(Text)

//     const textContainer = element?.shadowRoot?.firstElementChild as HTMLElement | null
//     if (!textContainer) return []

//     const lines = getLines(textContainer)
//       .map((line) => line.text)
//       .flatMap((line) => {
//         if (fontFamily === 'Courier Prime Sans') {
//           return [line]
//         }

//         return figlet
//           .textSync(line, {
//             font: fontFamily,
//             horizontalLayout: 'full',
//             verticalLayout: 'full',
//           })
//           .split('\n')
//       })

//     return lines
//   }

//   private updateMaterial(mesh: Mesh, lines: string[]): void {
//     const width = mesh.scale.x
//     const height = mesh.scale.y

//     const rows = Math.round(height / this.grid.rowHeight)
//     const cols = Math.round(width / this.grid.colWidth)

//     resizeAndMaybeRecreateLetterMaterial(mesh, rows, cols)

//     const material = mesh.material as LetterMaterial

//     const black = new Color({
//       red: 0,
//       green: 0,
//       blue: 0,
//       alpha: 255,
//     })

//     const invisible = new Color({
//       red: 0,
//       green: 0,
//       blue: 0,
//       alpha: 0,
//     })

//     material.colors.value.image.data.fill(0)

//     // Fill the grid with characters from the split lines
//     for (let row = 0; row < Math.min(rows, lines.length); row++) {
//       const line = lines[row]

//       for (let col = 0; col < Math.min(cols, line.length); col++) {
//         const c = line[col]
//         material.setCharAtPosition(c, row, col)
//         if (c === ' ') {
//           material.setColorAtPosition(invisible, row, col)
//         } else {
//           material.setColorAtPosition(black, row, col)
//         }
//       }
//     }
//   }

//   private updateText(textEntity: Entity): void {
//     const block = textEntity.read(Block)
//     const mesh = this.resources.scene.getObjectByName(block.id) as Mesh | undefined
//     if (!mesh) return

//     const element = document.getElementById(block.id) as ICEditableBlock | null
//     if (!element) return

//     const lines = this.getTextLines(textEntity, element)

//     this.updateMaterial(mesh, lines)
//   }

//   private async updateTextWaitForElement(textEntity: Entity): Promise<void> {
//     const block = textEntity.read(Block)

//     const element = document.getElementById(block.id) as ICEditableBlock | null
//     if (!element) return

//     await element.updateComplete

//     this.updateText(textEntity)
//   }

//   public toggleElementVisibility(id: string, visible: boolean): void {
//     const element = document.getElementById(id)
//     if (!element) return

//     element.style.opacity = visible ? '1' : '0'
//   }

//   public execute(): void {
//     // all text elements start out invisible
//     for (const textEntity of this.texts.added) {
//       const block = textEntity.read(Block)
//       // if (block.tag !== 'ic-text') continue

//       const element = document.getElementById(block.id)
//       if (!element) continue

//       element.style.backgroundColor = this.resources.fontData.backgroundColor

//       this.toggleElementVisibility(block.id, false)
//     }

//     // when editing the text make the text element fully visible
//     for (const editedTextEntity of this.editedTexts.added) {
//       // hide the mesh while editing
//       const block = editedTextEntity.read(Block)
//       this.toggleElementVisibility(block.id, true)
//     }

//     for (const editedTextEntity of this.editedTexts.removed) {
//       const block = editedTextEntity.read(Block)
//       this.toggleElementVisibility(block.id, false)
//     }

//     for (const textEntity of this.texts.added) {
//       console.log('UPDATE TEXT RENDER')
//       this.updateTextWaitForElement(textEntity)
//     }

//     for (const textEntity of this.texts.changed) {
//       console.log('UPDATE TEXT RENDER')
//       this.updateText(textEntity)
//     }
//   }
// }
