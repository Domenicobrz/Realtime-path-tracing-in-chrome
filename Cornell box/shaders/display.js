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
    color *= pow(2.0, -1.0);
    vec3 mapped = acesFilm(color);

    // // gamma correction
    // mapped = pow(mapped, 1.0 / 2.2);




    // float exposure = 0.1;
    // vec3 mapped = color;
    // mapped *= pow(2.0, exposure);

    // // -- filmic correction
    // mapped *= 0.6;
    // mapped = ((mapped * mapped) * 2.51 + mapped * 0.03) / (mapped * mapped * 2.43 + mapped * 0.59 + 0.14);

    // -- gamma correction + clamp
    mapped = pow(mapped, vec3(1.0 / 2.2));
    mapped = clamp(mapped, 0.0, 1.0);




    gl_FragColor = vec4(mapped, 1.0);
}
`;

export { display_fs, display_vs };