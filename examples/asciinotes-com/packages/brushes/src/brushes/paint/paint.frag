precision highp float;

in vec2 vUV;

uniform sampler2D uPaintShape;
uniform sampler2D uPaintGrain;
uniform float uBrushSize;
uniform vec4 uBrushColor;
uniform vec2 uPosition;

void main() {
    vec4 shapeMask = texture2D(uPaintShape, vUV).rgba;

    // vec2 grainUv = fract(((vUV - vec2(0.5)) * 500.0 + 0.5 * (uPosition - (100.0 * uPosition))) / 500.0);
    vec2 grainUv = fract(vUV + uPosition / 5000.0);
    vec4 grain = texture2D(uPaintGrain, grainUv);

    vec3 color = uBrushColor.rgb + 0.1 * (vec3(1.0) - uBrushColor.rgb) * shapeMask.a;

    gl_FragColor = 0.7 * vec4(color.rgb * shapeMask.a, shapeMask.a) + 0.3 * grain * shapeMask.a;
}
