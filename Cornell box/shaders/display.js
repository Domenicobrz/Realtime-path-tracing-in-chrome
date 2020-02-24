let display_vs = `
varying vec2 vUv;

void main() {
    gl_Position = vec4(position, 1.0);
    vUv = uv;
}
`;

let display_fs = `
varying vec2 vUv;

uniform sampler2D uTexture;

vec3 acesFilm(const vec3 x) {
    const float a = 2.51;
    const float b = 0.03;
    const float c = 2.43;
    const float d = 0.59;
    const float e = 0.14;
    return clamp((x * (a * x + b)) / (x * (c * x + d ) + e), 0.0, 1.0);
}

void main() {
    vec3 color = texture2D(uTexture, vUv).xyz;
    vec3 mapped = acesFilm(color);

    gl_FragColor = vec4(mapped, 1.0);
}
`;

export { display_fs, display_vs };