let momentMove_vs = `
attribute vec3 oldPosition;


varying vec3 vFragPos;
varying vec3 vOldFragPos;

varying mat4 modelViewMat;
varying mat4 vProjectionMatrix;

// varying vec2 vOldNDCPos;

void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    
    vFragPos    = position;
    vOldFragPos = oldPosition;

    modelViewMat    = modelViewMatrix;
    vProjectionMatrix = projectionMatrix;
}
`;

let momentMove_fs = `
varying vec3 vFragPos;
varying vec3 vOldFragPos;

uniform mat4 uOldModelViewMatrix;

varying mat4 modelViewMat;
varying mat4 vProjectionMatrix;

// varying vec2 vOldNDCPos;

void main() {

    vec4 ndcOldPos = vProjectionMatrix * uOldModelViewMatrix * vec4(vOldFragPos, 1.0);
    vec4 ndcNewPos = vProjectionMatrix * modelViewMat * vec4(vFragPos, 1.0);

    ndcOldPos.xyzw /= ndcOldPos.w;
    ndcNewPos.xyzw /= ndcNewPos.w;

    ndcOldPos.xy = ndcOldPos.xy * 0.5 + 0.5;
    ndcNewPos.xy = ndcNewPos.xy * 0.5 + 0.5;

    gl_FragColor = vec4(ndcOldPos.xy - ndcNewPos.xy, 0.0, 1.0);
    // gl_FragColor = vec4(normalize(ndcOldPos.xy - ndcNewPos.xy) * 0.5 + 0.5, 0.0, 1.0);
    // gl_FragColor = vec4(ndcOldPos.xy, 0.0, 1.0);
}
`;

export { momentMove_fs, momentMove_vs };
