precision highp float;

in vec2 vUV;

uniform sampler2D uMarkerShape;
uniform sampler2D uMarkerGrain;
uniform float uBrushSize;
uniform vec4 uBrushColor;
uniform vec2 uPosition;
uniform vec2 uPrevPosition;

void main() {
    vec4 shapeMask = texture2D(uMarkerShape, vUV).rgba;
    float alpha = (0.005 + 0.15 * (1.0 - 0.5 * length(uBrushColor.rgb))) * shapeMask.a * uBrushColor.a;

    vec2 grainUV = fract(((vUV - vec2(0.5)) * 500.0 + 0.5 * (uPosition + uPrevPosition - (100.0 * (uPosition - uPrevPosition)))) / 500.0);
    vec4 grain = texture2D(uMarkerGrain, grainUV);

    vec3 color = uBrushColor.rgb + 0.1 * (vec3(0.5) - uBrushColor.rgb) * (1.0 - alpha);

    vec4 c = 0.8 * vec4(color.rgb * alpha, alpha) + 0.2 * grain * alpha;
    gl_FragColor = vec4(c.rgb, alpha);
}
