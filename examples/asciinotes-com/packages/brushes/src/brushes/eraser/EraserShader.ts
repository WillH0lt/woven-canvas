import * as PIXI from 'pixi.js';

import type { ShaderOptions } from '../BaseShader.js';
import BaseShader from '../BaseShader.js';
import fragment from './eraser.frag';
import vertex from './eraser.vert';

export interface EraserShaderOptions extends ShaderOptions {
  eraserShape: PIXI.Texture;
}

export class EraserShader extends BaseShader {
  public constructor(options: EraserShaderOptions) {
    const glProgram = PIXI.GlProgram.from({
      vertex,
      fragment,
    });

    const resources = {
      uEraserShape: options.eraserShape.source,
    };

    super(glProgram, resources, options);
  }
}
