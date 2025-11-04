import * as PIXI from 'pixi.js';

import type { ShaderOptions } from '../BaseShader.js';
import BaseShader from '../BaseShader.js';
import fragment from './crayon.frag';
import vertex from './crayon.vert';

export interface CrayonShaderOptions extends ShaderOptions {
  crayonShape: PIXI.Texture;
  crayonGrain: PIXI.Texture;
}

export class CrayonShader extends BaseShader {
  public constructor(options: CrayonShaderOptions) {
    const glProgram = PIXI.GlProgram.from({
      vertex,
      fragment,
    });

    const resources = {
      uCrayonShape: options.crayonShape.source,
      uCrayonGrain: options.crayonGrain.source,
    };

    super(glProgram, resources, options);
  }
}
