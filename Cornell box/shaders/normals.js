let normal_vs = `
varying vec3 vWorldSpaceNormal;
varying vec3 vWorldSpacePosition;

void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    vWorldSpaceNormal = normal;
    vWorldSpacePosition = position;
}
`;

let normal_fs = `
varying vec3 vWorldSpaceNormal;
varying vec3 vWorldSpacePosition;

uniform vec3 uCameraPos;

void main() {
    // vec3 viewDir = normalize(vWorldSpacePosition - uCameraPos);

    vec3 normal = normalize(vWorldSpaceNormal);
    // if(dot(viewDir, normal) > 0.0) normal = -normal;

    gl_FragColor = vec4(normal, 1.0);
}
`;

export { normal_fs, normal_vs };