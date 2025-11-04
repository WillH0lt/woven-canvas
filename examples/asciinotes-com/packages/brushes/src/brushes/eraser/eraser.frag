precision highp float;

in vec2 vUV;

uniform sampler2D uEraserShape;
uniform float uBrushSize;
uniform vec2 uPosition;

void main() {
    vec4 shapeMask = texture2D(uEraserShape, vUV);
    gl_FragColor = shapeMask
}
