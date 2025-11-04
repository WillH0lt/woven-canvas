import merge from 'lodash.merge';
import * as PIXI from 'pixi.js';

export interface ShaderOptions {
  brushSize?: number;
  brushColor?: [number, number, number, number];
  position?: [number, number];
  prevPosition?: [number, number];
}

interface BrushResources {
  brushUniforms: {
    uniforms: {
      uBrushSize: number;
      uBrushColor: Float32Array;
      uPosition: Float32Array;
      uPrevPosition: Float32Array;
    };
  };
}

abstract class BaseShader extends PIXI.Shader {
  public constructor(
    glProgram: PIXI.GlProgram,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resources: Record<string, any>,
    options: ShaderOptions,
  ) {
    const baseResources = {
      brushUniforms: {
        uBrushSize: { value: options.brushSize, type: 'f32' },
        uBrushColor: { value: options.brushColor, type: 'vec4<f32>' },
        uPosition: { value: options.position, type: 'vec2<f32>' },
        uPrevPosition: { value: options.prevPosition, type: 'vec2<f32>' },
      },
    };

    super({
      glProgram,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      resources: merge(baseResources, resources),
    });
  }

  private get brushResources(): BrushResources {
    return this.resources as BrushResources;
  }

  public setBrushSize(value: number): void {
    this.brushResources.brushUniforms.uniforms.uBrushSize = value;
  }

  public setBrushColor(value: [number, number, number, number]): void {
    this.brushResources.brushUniforms.uniforms.uBrushColor[0] = value[0] / 255;
    this.brushResources.brushUniforms.uniforms.uBrushColor[1] = value[1] / 255;
    this.brushResources.brushUniforms.uniforms.uBrushColor[2] = value[2] / 255;
    this.brushResources.brushUniforms.uniforms.uBrushColor[3] = value[3] / 255;
  }

  public setPosition(value: [number, number]): void {
    this.brushResources.brushUniforms.uniforms.uPosition[0] = value[0];
    this.brushResources.brushUniforms.uniforms.uPosition[1] = value[1];
  }

  public setPrevPosition(value: [number, number]): void {
    this.brushResources.brushUniforms.uniforms.uPrevPosition[0] = value[0];
    this.brushResources.brushUniforms.uniforms.uPrevPosition[1] = value[1];
  }
}

export default BaseShader;
