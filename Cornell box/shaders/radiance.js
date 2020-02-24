function makeSceneShaders(tot_triangles) {
    
    window.radiance_vs = `
    varying vec2 vUv;

    void main() {
        gl_Position = vec4(position, 1.0);

        vUv = uv;
    }
    `;

    window.radiance_fs = `
    uniform vec4 uScene[${tot_triangles * 3}];
    // uniform vec3 uScene[6];

    uniform vec3 uCameraPos;
    uniform vec3 uCameraTarget;
    uniform float uAspectRatio;
    uniform float uRadMult;
    uniform float uTime;
    uniform float uMirrorIndex;
    uniform vec4 uRandom;

    uniform sampler2D uPositionBuffer;

    varying vec2 vUv;

    struct intersectionResult 
    {
        vec3 n;
        float t;
        bool hit;
        float meshIndex;
    };


    #define PI 3.14159265359


    bool rayTriangleIntersect(vec3 O, vec3 D, vec3 A, vec3 B, vec3 C, inout float t, inout vec3 normal) {
        // Ray-triangle isect:
        vec3 E1=B-A; vec3 E2=C-A;

        vec3 N=cross(E1,E2);
        normal = normalize(N);

        float det = -dot(D,N);
        vec3 AO = O - A;
        vec3 DAO = cross(AO,D);

        float u =  dot(E2,DAO)/det;
        float v = -dot(E1,DAO)/det;
        t       =  dot(AO,N)/det;

        return (
            t > 0.0 && u > 0.0 && v > 0.0 && (u+v) < 1.0
        );
    }

    // bool rayTriangleIntersect(vec3 ro, vec3 rd, vec3 v0, vec3 v1, vec3 v2, inout float t) {
    //     float kEpsilon = 0.0001;

    //     // return t;
    //     vec3 v0v1 = v1 - v0; 
    //     vec3 v0v2 = v2 - v0; 
    //     vec3 pvec = cross(rd, v0v2); 
    //     float det = dot(v0v1, pvec); 

    //     if (abs(det) < kEpsilon) return false; 

    //     float invDet = 1.0 / det; 
    
    //     vec3 tvec = ro - v0; 
    //     float u = dot(tvec, pvec) * invDet; 
    //     if (u < 0.0 || u > 1.0) return false; 
    
    //     vec3 qvec = cross(tvec, v0v1); 
    //     float v = dot(rd, qvec) * invDet; 
    //     if (v < 0.0 || u + v > 1.0) return false; 
    
    //     t = dot(v0v2, qvec) * invDet; 
    
    //     return true; 
    // }


    intersectionResult scene(vec3 ro, vec3 rd) {
        // vec3 triangles[6];
        // triangles[0] = vec3(-1.0, 0.0, 0.0);
        // triangles[1] = vec3(+1.0, 0.0, 0.0);
        // triangles[2] = vec3( 0.0, 1.7, 0.0);

        // triangles[3] = vec3(-17.0, 0.0,  8.0);
        // triangles[4] = vec3(+17.0, 0.0,  8.0);
        // triangles[5] = vec3( 0.0,  0.0, -13.0);



        vec3 normal = vec3(0.0);
        float mint = 9999999999.0;
        bool hit = false;
        float meshIndex = 0.0;

        // for(int i = 0; i < 2; i++) {
        for(int i = 0; i < ${tot_triangles}; i++) {
            vec3 v0 = uScene[i*3 + 0].xyz;
            vec3 v1 = uScene[i*3 + 1].xyz;
            vec3 v2 = uScene[i*3 + 2].xyz;
        
            vec3 n = vec3(0.0);
            float t = 999999999.0;

            if(rayTriangleIntersect(ro, rd, v0, v1, v2, t, n)) {
                if(t < mint) {
                    mint = t;
                    hit = true;
                    normal = n;
                    meshIndex = uScene[i*3 + 0].w;
                }
            }
        }

        if(dot(normal, rd) > 0.0) {
            normal = -normal;
        }

        return intersectionResult( normal, mint, hit, meshIndex );
    }

    // one out, three in
    float rand(vec3 p3)
    {
    	p3  = fract(p3 * .1031);
        p3 += dot(p3, p3.yzx + 33.33);
        return fract((p3.x + p3.y) * p3.z);
    }

    //  3 out, 3 in...
    vec3 hash33(vec3 p3)
    {
    	p3 = fract(p3 * vec3(.1031, .1030, .0973));
        p3 += dot(p3, p3.yxz+33.33);
        return fract((p3.xxy + p3.yxx)*p3.zyx);

    }

    vec3 sampleDiffuseHemisphere(vec3 normal, vec3 pos) {
        float theta = 2.0 * PI * rand(pos * 100.0 + uRandom.x * 127.0);
        float phi = acos(2.0 * rand(pos * 100.0 + uRandom.y * 127.0) - 1.0);

        vec3 unitSphereSample = vec3(
            cos(theta) * sin(phi),
            sin(theta) * sin(phi),
            cos(phi)
        );

        vec3 np = pos + normal + unitSphereSample;
        return normalize(np - pos);
    }

    vec3 sampleGlossyHemisphere(vec3 normal, vec3 pos, vec3 dir) {
        vec3 wout = reflect(dir, normal);

        float theta = 2.0 * PI * rand(pos * 100.0 + uRandom.x * 127.0);
        float phi = acos(2.0 * rand(pos * 100.0 + uRandom.y * 127.0) - 1.0);

        vec3 unitSphereSample = vec3(
            cos(theta) * sin(phi),
            sin(theta) * sin(phi),
            cos(phi)
        );

        vec3 np = pos + wout + unitSphereSample * 0.001;
        return normalize(np - pos);
    }

    void main() {
        vec3 radiance = vec3(0.0);
        vec2 ndcuv = (vUv * 2.0 - 1.0) * vec2(uAspectRatio, 1.0);

        // "height normalizer"
        float hn = tan(/* IN RADIANTI, NON IN GRADI, COGLIONR! */ (PI * 45.0 * 0.5) / 180.0);
        ndcuv *= hn;


        vec3 ro = uCameraPos;

        vec3 w = normalize(uCameraTarget - uCameraPos);
        vec3 u = normalize(cross(w, vec3(0.0, 1.0, 0.0)));
        vec3 v = normalize(cross(u, w));

        vec3 d = normalize(vec3(ndcuv, 1.0));
        vec3 nd = normalize( u * d.x + v * d.y + w * d.z );

        vec3 rd = nd;


        vec3 posBuff = texture2D(uPositionBuffer, vUv).xyz;
        // why posBuff minus rd ?
        // remember: the wall's front-faces are culled!
        // so the first position that you "see" in the positionBuffer,
        // is already far into the scene!
        ro = posBuff - rd * 0.01;

        if(posBuff == vec3(0.0)) {
            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
            return;
        }




        vec3 mult = vec3(1.0);
        for(int i = 0; i < 4; i++) {
            intersectionResult ir = scene(ro, rd);

            if(ir.hit) {
                // radiance = vec3(ir.n);
                vec3 albedo = vec3(1.0);

                ro = ro + rd * (ir.t - 0.001);

                float cos;

                // if(ir.meshIndex > 2.7 && ir.meshIndex < 3.2) {
                if(ir.meshIndex > uMirrorIndex - 0.2 && ir.meshIndex < uMirrorIndex + 0.2) {
                    rd = sampleGlossyHemisphere(ir.n, ro, rd);
                    // albedo = vec3(0.86, 0.86, 0.86);
                    albedo = vec3(1.0, 1.0, 1.0);
                    cos = 1.0;
                } else {
                    rd = sampleDiffuseHemisphere(ir.n, ro);
                    cos = dot(rd, ir.n);
                }

                if(ir.meshIndex > 14.0) {
                    radiance += vec3(6.0) * mult;
                }
                if(ir.meshIndex == 1.0) {
                    // albedo = vec3(1.0, 0.3, 0.15);
                    albedo = vec3(1.0, 0.3, 0.15);
                }
                if(ir.meshIndex == 2.0) {
                    // albedo = vec3(0.15, 1.0, 0.3);
                    albedo = vec3(0.15, 0.6, 1.0).yzx;
                    // albedo = vec3(0.949, 0.2627, 0.2);
                }


                mult *= albedo;
                // sometimes the dot is negative (no idea why) so we need to make sure and guard this operation with max(...)
                mult *= max(cos, 0.0);
            } 
        }

    
        gl_FragColor = vec4(radiance * uRadMult, 1.0);
    }
    `;
}

export { makeSceneShaders };