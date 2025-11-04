import * as PIXI from 'pixi.js';

import type { ShaderOptions } from '../BaseShader.js';
import BaseShader from '../BaseShader.js';
import fragment from './marker.frag';
import vertex from './marker.vert';

export interface MarkerShaderOptions extends ShaderOptions {
  markerShape: PIXI.Texture;
  markerGrain: PIXI.Texture;
}

export class MarkerShader extends BaseShader {
  public constructor(options: MarkerShaderOptions) {
    const glProgram = PIXI.GlProgram.from({
      vertex,
      fragment,
    });

    const resources = {
      uMarkerShape: options.markerShape.source,
      uMarkerGrain: options.markerGrain.source,
    };

    super(glProgram, resources, options);
  }
}
