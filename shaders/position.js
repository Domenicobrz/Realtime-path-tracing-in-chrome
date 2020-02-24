let position_vs = `
varying vec3 vWorldSpacePosition;

void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    vWorldSpacePosition = position;
}
`;

let position_fs = `
varying vec3 vWorldSpacePosition;

void main() {
    gl_FragColor = vec4(vWorldSpacePosition, 1.0);
}
`;

export { position_fs, position_vs };