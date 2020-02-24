let material_vs = `
attribute vec4 aMaterial;

varying vec4 vMaterial;

void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

    vMaterial = aMaterial;
}
`;

let material_fs = `
varying vec4 vMaterial;

void main() {
    gl_FragColor = vMaterial;
}
`;

export { material_fs, material_vs };