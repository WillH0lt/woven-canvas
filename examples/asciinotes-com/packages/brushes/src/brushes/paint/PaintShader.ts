import * as PIXI from 'pixi.js';

import type { ShaderOptions } from '../BaseShader.js';
import BaseShader from '../BaseShader.js';
import fragment from './paint.frag';
import vertex from './paint.vert';

export interface PaintShaderOptions extends ShaderOptions {
  paintShape: PIXI.Texture;
  paintGrain: PIXI.Texture;
}

export class PaintShader extends BaseShader {
  public constructor(options: PaintShaderOptions) {
    const glProgram = PIXI.GlProgram.from({
      vertex,
      fragment,
    });

    const resources = {
      uPaintShape: options.paintShape.source,
      uPaintGrain: options.paintGrain.source,
    };

    super(glProgram, resources, options);
  }
}
