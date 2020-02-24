let radianceAccum_vs = `
varying vec2 vUv;

void main() {
    gl_Position = vec4(position, 1.0);
    vUv = uv;
}
`;

let radianceAccum_fs = `
varying vec2 vUv;

uniform sampler2D uCurrentRadiance;
uniform sampler2D uAccumulatedRadiance;
uniform sampler2D uHistoryBuffer;
uniform sampler2D uMomentMoveBuffer;

uniform float uMaxFramesHistory; 

void main() {

    vec2 reprojUVOffs = texture2D(uMomentMoveBuffer, vUv).xy;

    vec3 newRad = texture2D(uCurrentRadiance, vUv).xyz;
    vec3 accumulatedRad = texture2D(uAccumulatedRadiance, vUv + reprojUVOffs).xyz;


    float maxFrames = uMaxFramesHistory;
    float history = min(texture2D(uHistoryBuffer, vUv).x, maxFrames);

    // float lambda = ((maxFrames - history) / maxFrames) * 0.95 + 0.05;
    // REMEMBER: this is an exponential average, and apparently the perceived variance
    // WILL be lower if we accumulate more than $maxFrames samples (the variance reduction
    // stops at around 2 * $maxFrames samples, that's why the atrous filter multiplies
    // the clamped history by 0.5
    float lambda = (((maxFrames+1.0) - history) / (maxFrames+1.0));


    // float material = texture2D(uMaterialBuffer, vUv).w;
    // lambda = material == 3.0 ? 0.1 : lambda;

    vec3 updatedAccum = newRad * lambda + accumulatedRad * (1.0 - lambda);

    gl_FragColor = vec4(updatedAccum, 1.0);
}
`;

export { radianceAccum_fs, radianceAccum_vs};