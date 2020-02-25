import * as THREE from "./dependencies/three.module.js";
import { OrbitControls } from "./dependencies/orbitControls.js";
import { position_fs, position_vs } from "./shaders/position.js";
import { material_fs, material_vs } from "./shaders/material.js";
import { normal_fs, normal_vs } from "./shaders/normals.js";
import { display_fs, display_vs } from "./shaders/display.js";
import { makeSceneShaders } from "./shaders/radiance.js";
import { atrous_fs, atrous_vs } from "./shaders/atrous.js";
import { momentMove_fs, momentMove_vs } from "./shaders/momentMove.js";
import { historyTest_fs, historyTest_vs, historyAccum_fs, historyAccum_vs } from "./shaders/history.js";
import { radianceAccum_fs, radianceAccum_vs } from "./shaders/radianceAccum.js";
import * as dat from './dependencies/dat.gui.js';


window.addEventListener("load", init);

let scene; 
let displayScene;
let camera;
let controls;
let renderer;
let pmremGenerator;
let hdrCubeRenderTarget;
let HDRtexture;

let positionRT;
let normalRT;
let radianceRT;
let atrousRT;
let momentMoveRT;
let historyRT;
let materialRT;

let positionBufferMaterial;
let materialBufferMaterial;
let normalBufferMaterial;
let radianceBufferMaterial;
let momentBufferMaterial;
let historyTestMaterial;
let historyAccumMaterial;
let radianceAccumMaterial;
let atrousMaterial;

let displayQuadMesh;
let mesh;

let kpress;
let lpress;
let opress;
let ppress;
let npress;
let mpress;


function init() {
    // let w = new THREE.Vector3(0, 0, -1);
    // let u = w.clone().cross(new THREE.Vector3(0, 1, 0));
    // let v = u.clone().cross(w);
    // console.log(u);
    // console.log(v);
    // return;

    renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.8;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.autoClear = false;
    document.body.appendChild( renderer.domElement );

    scene = new THREE.Scene();
    displayScene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 1000 );

    controls = new OrbitControls( camera, renderer.domElement );
    controls.enableDamping = true;
    controls.dampingFactor = 0.0875;
    controls.enablePan = true;
    controls.panSpeed = 1.0;
    controls.screenSpacePanning = true;

    //controls.update() must be called after any manual changes to the camera's transform
    camera.position.set( 0, 1, 18 );
    controls.target.set( 0, 0, 0 );
    controls.update();



    let geom = createGeometry(0);



    positionRT = new THREE.WebGLRenderTarget(innerWidth, innerHeight, {
        magFilter: THREE.NearestFilter,
        minFilter: THREE.NearestFilter,
        type: THREE.FloatType,
        stencilBuffer: false,
    });

    normalRT = new THREE.WebGLRenderTarget(innerWidth, innerHeight, {
        magFilter: THREE.NearestFilter,
        minFilter: THREE.NearestFilter,
        type: THREE.FloatType,
        stencilBuffer: false,
    });

    momentMoveRT = new THREE.WebGLRenderTarget(innerWidth, innerHeight, {
        magFilter: THREE.NearestFilter,
        minFilter: THREE.NearestFilter,
        type: THREE.FloatType,
        stencilBuffer: false,
    }); 
    
    materialRT = new THREE.WebGLRenderTarget(innerWidth, innerHeight, {
        magFilter: THREE.NearestFilter,
        minFilter: THREE.NearestFilter,
        type: THREE.FloatType,
        stencilBuffer: false,
    });


    atrousRT = createDoubleFBO(innerWidth, innerHeight, THREE.NearestFilter);
    historyRT = createTripleFBO(innerWidth, innerHeight, THREE.NearestFilter);
    radianceRT = createTripleFBO(innerWidth, innerHeight, THREE.NearestFilter);



    positionBufferMaterial = new THREE.ShaderMaterial({
        fragmentShader: position_fs,
        vertexShader: position_vs,
        side: THREE.DoubleSide,
    });

    normalBufferMaterial = new THREE.ShaderMaterial({
        uniforms: {
            "uCameraPos": { value: camera.position },
        },
        fragmentShader: normal_fs,
        vertexShader: normal_vs,
        side: THREE.DoubleSide,
    });

    materialBufferMaterial = new THREE.ShaderMaterial({
        fragmentShader: material_fs,
        vertexShader: material_vs,
        side: THREE.DoubleSide,
    });

    momentBufferMaterial = new THREE.ShaderMaterial({
        uniforms: {
            "uOldModelViewMatrix": { value: new THREE.Matrix4() },
        },
        fragmentShader: momentMove_fs,
        vertexShader: momentMove_vs,
        side: THREE.DoubleSide,
    });

    radianceBufferMaterial = new THREE.ShaderMaterial({
        uniforms: {
            "uScene":    { value: geom.uniform },

            "uRadMult":    { value: 1 },
            "uCameraPos":    { value: camera.position },
            "uCameraTarget": { value: controls.target },
            "uAspectRatio": { value: innerWidth / innerHeight },
            "uRandom": { value: new THREE.Vector4(0, 0, 0, 0) },
            "uTime": { value: 0 },

            "uMirrorIndex": { value: 1 },

            "uPositionBuffer": { type: "t", value: positionRT.texture },
        },
        transparent: true,
        blending: THREE.CustomBlending,
        blendEquation: THREE.AddEquation,
        blendSrc: THREE.OneFactor,
        blendDst: THREE.OneFactor,

        fragmentShader: radiance_fs,
        vertexShader: radiance_vs,
        side: THREE.DoubleSide,
    });

    atrousMaterial = new THREE.ShaderMaterial({
        defines: {
            "atrous3x3": true,
        },
        uniforms: {
            "uRadiance": { type: "t", value: radianceRT.rt3.texture },
            "uNormal": { type: "t",   value: normalRT.texture   },
            "uPosition": { type: "t", value: positionRT.texture },
            "uMaterial": { type: "t", value: materialRT.texture },
            "uHistoryAccum": { type: "t", value: historyRT.rt3.texture },
            "uFilterHistoryModulation": { value: 0 },
            "uMaxFramesHistory": { value: 0 },
            "uStep": { value: 1.0 },
            "uScreenSize": { value: new THREE.Vector2(innerWidth, innerHeight) },
            "uC_phi": { value: 0.0 },
            "uN_phi": { value: 0.0 },
            "uP_phi": { value: 0.0 },
        },
        fragmentShader: atrous_fs,
        vertexShader: atrous_vs,
        side: THREE.DoubleSide,
    });

    historyTestMaterial = new THREE.ShaderMaterial({
        uniforms: {
            "uNormalBuffer":   { type: "t", value: normalRT.texture   },
            "uPositionBuffer": { type: "t", value: positionRT.texture },
            "uMomentMove":     { type: "t", value: momentMoveRT.texture },
            "uCameraPos":      { type: "t", value: camera.position },
            "uInvScreenSize":  { value: new THREE.Vector2(1 / innerWidth, 1 / innerHeight) },
        },
        fragmentShader: historyTest_fs,
        vertexShader: historyTest_vs,
        side: THREE.DoubleSide,
    });


    historyAccumMaterial = new THREE.ShaderMaterial({
        uniforms: {
            "uHistoryTest": { type: "t",  value: null },
            "uHistoryAccum": { type: "t", value: null },
            "uMomentMove": { type: "t", value: momentMoveRT.texture },
        },
        fragmentShader: historyAccum_fs,
        vertexShader: historyAccum_vs,
        side: THREE.DoubleSide,
    });

    radianceAccumMaterial = new THREE.ShaderMaterial({
        uniforms: {
            "uCurrentRadiance": { type: "t",  value: null },
            "uAccumulatedRadiance": { type: "t", value: null },
            "uHistoryBuffer": { type: "t", value: null },
            "uMomentMoveBuffer": { type: "t", value: null },
            "uMaxFramesHistory": { type: "t", value: null },
        },
        fragmentShader: radianceAccum_fs,
        vertexShader: radianceAccum_vs,
        side: THREE.DoubleSide,
    });

    window.displayMaterial = new THREE.ShaderMaterial({
        uniforms: {
            "uTexture": { type: "t", value: radianceRT.rt3.texture },
        },
        fragmentShader: display_fs,
        vertexShader: display_vs,
        side: THREE.DoubleSide,
    });




    


    // pmremGenerator = new THREE.PMREMGenerator( renderer, "1.44" );
    // // pmremGenerator.compileEquirectangularShader();


    // let hdrEquiTexture;
    // new RGBELoader()
    // .setDataType( THREE.UnsignedByteType ) // alt: FloatType, HalfFloatType
    // .load( "envmaps/env.hdr", function ( texture, textureData ) {    

    //     HDRtexture = texture;
    //     // hdrEquiTexture = texture;
    //     hdrCubeRenderTarget = pmremGenerator.fromEquirectangular( texture ); 

    //     onDownload();
    // });

    var material = new THREE.MeshBasicMaterial( { color: 0xffffff } );
    mesh = new THREE.Mesh( geom.geometry, material );
    mesh.geometryCULL = geom.geometryCULL;

    scene.add(mesh);



    window.addEventListener("keydown", (e) => {
        if(e.key == "k") kpress = true;
        if(e.key == "l") lpress = true;
        if(e.key == "p") ppress = true;
        if(e.key == "o") opress = true;
        if(e.key == "m") mpress = true;
        if(e.key == "n") npress = true;
        
    });
    window.addEventListener("keyup", (e) => {
        if(e.key == "k") kpress = false;
        if(e.key == "l") lpress = false;
        if(e.key == "p") ppress = false;
        if(e.key == "o") opress = false;
        if(e.key == "m") mpress = false;
        if(e.key == "n") npress = false;
    });



    displayQuadMesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(2,2), displayMaterial);
    displayScene.add(displayQuadMesh);


    initGUI();
    animate(0);
}

function createDoubleFBO(w, h, filtering) {
    let rt1 = new THREE.WebGLRenderTarget(w, h, {
        type:          THREE.FloatType,
        minFilter:     filtering || THREE.LinearFilter,
        magFilter:     filtering || THREE.LinearFilter,
        wrapS:         THREE.ClampToEdgeWrapping,
        wrapT:         THREE.ClampToEdgeWrapping,
        format:        THREE.RGBAFormat,
        stencilBuffer: false,
        anisotropy:    1,
    });

    let rt2 = new THREE.WebGLRenderTarget(w, h, {
        type:          THREE.FloatType,
        minFilter:     filtering || THREE.LinearFilter,
        magFilter:     filtering || THREE.LinearFilter,
        wrapS:         THREE.ClampToEdgeWrapping,
        wrapT:         THREE.ClampToEdgeWrapping,
        format:        THREE.RGBAFormat,
        stencilBuffer: false,
        anisotropy:    1,
    });

    return {
        read:  rt1,
        write: rt2,
        swap: function() {
            let temp   = this.read;
            this.read  = this.write;
            this.write = temp;
        }
    };
}

function createTripleFBO(w, h, filtering) {
    let rt1 = new THREE.WebGLRenderTarget(w, h, {
        type:          THREE.FloatType,
        minFilter:     filtering || THREE.LinearFilter,
        magFilter:     filtering || THREE.LinearFilter,
        wrapS:         THREE.ClampToEdgeWrapping,
        wrapT:         THREE.ClampToEdgeWrapping,
        format:        THREE.RGBAFormat,
        stencilBuffer: false,
        anisotropy:    1,
    });

    let rt2 = new THREE.WebGLRenderTarget(w, h, {
        type:          THREE.FloatType,
        minFilter:     filtering || THREE.LinearFilter,
        magFilter:     filtering || THREE.LinearFilter,
        wrapS:         THREE.ClampToEdgeWrapping,
        wrapT:         THREE.ClampToEdgeWrapping,
        format:        THREE.RGBAFormat,
        stencilBuffer: false,
        anisotropy:    1,
    });

    let rt3 = new THREE.WebGLRenderTarget(w, h, {
        type:          THREE.FloatType,
        minFilter:     filtering || THREE.LinearFilter,
        magFilter:     filtering || THREE.LinearFilter,
        wrapS:         THREE.ClampToEdgeWrapping,
        wrapT:         THREE.ClampToEdgeWrapping,
        format:        THREE.RGBAFormat,
        stencilBuffer: false,
        anisotropy:    1,
    });

    return {
        rt1: rt1,
        rt2: rt2,
        rt3: rt3,
        swap_rt2_rt3: function() {
            let temp = this.rt2;
            this.rt2 = this.rt3;
            this.rt3 = temp;
        }
    };
}

let prevMeshGeometryCull;
function animate(now) {
    requestAnimationFrame( animate );

    now *= 0.001;


    // HAI DOVUTO DISABILITARE SCOPE.UPDATE() DURANTE IL MOUSEMOVE/MOUSEDOWN ETC
    // DENTRO LO SCRIPT ORBITCONTROLS.js,
    // ALTRIMENTI controls.lastViewMatrixInverse SAREBBE STATA UGUALE ALLA
    // CURRENT MATRIX (mentre cliccavi e facevi drag), FACENDO SBALLARE I CALCOLI 
    // DELL'HISTORYTEST.
    // NON HAI DISABILITATO SCOPE.UPDATE() NELL'HANDLING DEI TOUCH-EVENT, QUINDI 
    // QUESTO PROGETTO
    // NON FUNZIONERA' SUI MOBILES FINCHE' NON RIMUOVI SCOPE.UPDATE() ANCHE DA LI'
    controls.update();



    let newgeo = createGeometry(now);
    let oldgeometryCULL = mesh.geometryCULL;
    let oldgeometry = mesh.geometry;
    mesh.geometry = newgeo.geometry;
    mesh.geometryCULL = newgeo.geometryCULL;
    radianceBufferMaterial.uniforms.uScene.value = newgeo.uniform;
    radianceBufferMaterial.uniforms.uScene.needsUpdate = true;
    radianceBufferMaterial.uniforms.needsUpdate = true;
    radianceBufferMaterial.needsUpdate = true;



    // we need to create moment buffers BEFORE we update normal/position RTs
    // **************** create moment buffers
    // are you surprised I'm using the matrixWorldInverse? then think more..
    // are you surprised I'm using the matrixWorldInverse? then think more..
    let oldCameraMatrix = controls.lastViewMatrixInverse;
    let mgCULL = createMomentGeometry(newgeo.geometryCULL, oldgeometryCULL);
    let mg     = createMomentGeometry(newgeo.geometry, oldgeometry);

    momentBufferMaterial.uniforms.uOldModelViewMatrix.value = oldCameraMatrix;
    momentBufferMaterial.uniforms.uOldModelViewMatrix.needsUpdate = true;
    momentBufferMaterial.uniforms.needsUpdate = true;
    momentBufferMaterial.needsUpdate = true;
    momentBufferMaterial.side = THREE.FrontSide;
    renderer.setRenderTarget(momentMoveRT);
    mesh.material = momentBufferMaterial;
    renderer.clear();
    mesh.geometry = mgCULL;
    renderer.render( scene, camera );

    renderer.setRenderTarget(momentMoveRT);
    mesh.geometry = mg;
    momentBufferMaterial.side = THREE.DoubleSide;
    renderer.render( scene, camera );
    // reassign the new geometry after we're done here...
    mesh.geometry = newgeo.geometry;
    // **************** create moment buffers - END



    // ************** create history buffer
    // on rt1 we add the success vs unsuccess buffer (either +1 or -1)
    renderer.setRenderTarget(historyRT.rt1);
    renderer.clear();
    mesh.material = historyTestMaterial;
    mesh.geometry = newgeo.geometryCULL;
    historyTestMaterial.uniforms.uCameraPos.value = camera.position;
    historyTestMaterial.side = THREE.FrontSide;
    renderer.render( scene, camera );

    renderer.setRenderTarget(historyRT.rt1);
    historyTestMaterial.side = THREE.DoubleSide;
    mesh.geometry = newgeo.geometry;
    renderer.render( scene, camera );



    historyRT.swap_rt2_rt3();
    // rt2 now holds the previously accumulated values
    // rt3 updates the old accumulated values with the new buffer on rt1
    renderer.setRenderTarget(historyRT.rt3);
    renderer.clear();
    displayQuadMesh.material = historyAccumMaterial;
    historyAccumMaterial.uniforms.uHistoryTest.value = historyRT.rt1.texture;
    historyAccumMaterial.uniforms.uHistoryAccum.value = historyRT.rt2.texture;
    renderer.render( displayScene, camera );
    // ************** create history buffer - END




    // **************** creating buffers
    renderer.setRenderTarget(positionRT);
    mesh.material = positionBufferMaterial;
    positionBufferMaterial.side = THREE.FrontSide;
    mesh.geometry = newgeo.geometryCULL;
    renderer.clear();
    renderer.render( scene, camera );

    renderer.setRenderTarget(positionRT);
    positionBufferMaterial.side = THREE.DoubleSide;
    mesh.geometry = newgeo.geometry;
    renderer.render( scene, camera );



    renderer.setRenderTarget(materialRT);
    mesh.material = materialBufferMaterial;
    mesh.material.side = THREE.FrontSide;
    mesh.geometry = newgeo.geometryCULL;
    renderer.clear();
    renderer.render( scene, camera );

    renderer.setRenderTarget(materialRT);
    mesh.material.side = THREE.DoubleSide;
    mesh.geometry = newgeo.geometry;
    renderer.render( scene, camera );



    renderer.setRenderTarget(normalRT);
    mesh.material = normalBufferMaterial;
    mesh.material.side = THREE.FrontSide;
    mesh.geometry = newgeo.geometryCULL;
    normalBufferMaterial.uniforms.uCameraPos.value = camera.position;
    renderer.clear();
    renderer.render( scene, camera );
    
    renderer.setRenderTarget(normalRT);
    mesh.geometry = newgeo.geometry;
    mesh.material.side = THREE.DoubleSide;
    renderer.render( scene, camera );


    renderer.setRenderTarget(radianceRT.rt1);
    renderer.clear();
    for(let i = 0; i < controller.spp; i++) {
        renderer.setRenderTarget(radianceRT.rt1);
        radianceBufferMaterial.uniforms.uRadMult.value = 1 / (controller.spp);
        radianceBufferMaterial.uniforms.uCameraPos.value = camera.position;
        radianceBufferMaterial.uniforms.uCameraTarget.value = controls.target;
        radianceBufferMaterial.uniforms.uRandom.value = new THREE.Vector4(Math.random(), Math.random(), Math.random(), Math.random());
        radianceBufferMaterial.uniforms.uTime.value = now;
        radianceBufferMaterial.uniforms.uMirrorIndex.value = controller.mirrorIndex;
        displayQuadMesh.material = radianceBufferMaterial;
        renderer.render(displayScene, camera );
    }
        // ************** accumulating radiance 
        radianceRT.swap_rt2_rt3();

        renderer.setRenderTarget(radianceRT.rt3);
        renderer.clear();
        displayQuadMesh.material = radianceAccumMaterial;
        radianceAccumMaterial.uniforms.uCurrentRadiance.value = radianceRT.rt1.texture;
        radianceAccumMaterial.uniforms.uAccumulatedRadiance.value = radianceRT.rt2.texture;
        radianceAccumMaterial.uniforms.uHistoryBuffer.value = historyRT.rt3.texture;
        radianceAccumMaterial.uniforms.uMomentMoveBuffer.value = momentMoveRT.texture;
        radianceAccumMaterial.uniforms.uMaxFramesHistory.value = controller.maxFramesHistory;
        renderer.render(displayScene, camera );
        // ************** accumulating radiance - END


    // **************** creating buffers - END




    // **************** atrous
    atrousMaterial.uniforms.uN_phi.value = controller.n_phi;
    atrousMaterial.uniforms.uP_phi.value = controller.p_phi;
    atrousMaterial.uniforms.uC_phi.value = controller.c_phi;

    renderer.setRenderTarget(atrousRT.write);
    atrousMaterial.uniforms.uRadiance.value = radianceRT.rt3.texture;
    atrousMaterial.uniforms.uHistoryAccum.value = historyRT.rt3.texture;
    atrousMaterial.uniforms.uMaxFramesHistory.value = controller.maxFramesHistory;
    atrousMaterial.uniforms.uFilterHistoryModulation.value = controller.filterHistoryModulation;
    atrousMaterial.uniforms.uStep.value  = 1.0;
    displayQuadMesh.material = atrousMaterial;
    renderer.clear();
    renderer.render(displayScene, camera );

    for(let i = 0; i < Math.floor(controller.iterations); i++) {
        atrousRT.swap();

        renderer.setRenderTarget(atrousRT.write);
        atrousMaterial.uniforms.uRadiance.value = atrousRT.read.texture;
        atrousMaterial.uniforms.uStep.value  *= controller.stepMultiplier;
        atrousMaterial.uniforms.uC_phi.value *= controller.c_phiMultPerIt;
        displayQuadMesh.material = atrousMaterial;
        renderer.clear();
        renderer.render(displayScene, camera );
    }
    atrousRT.swap();
    // **************** atrous - END







    renderer.setRenderTarget(null);
    displayQuadMesh.material = displayMaterial;
    // displayQuadMesh.material.uniforms.uTexture.value = radianceRT.rt3.texture;
    displayQuadMesh.material.uniforms.uTexture.value = atrousRT.write.texture;
    // if(kpress) {
    //     // displayQuadMesh.material.uniforms.uTexture.value = momentMoveRT.texture;
    //     // displayQuadMesh.material.uniforms.uTexture.value = normalRT.texture;
    //     // displayQuadMesh.material.uniforms.uTexture.value = historyRT.rt1.texture;
    //     // displayQuadMesh.material.uniforms.uTexture.value = historyRT.rt3.texture;
    //     displayQuadMesh.material.uniforms.uTexture.value = radianceRT.rt3.texture;
    // }
        
    if(kpress) displayQuadMesh.material.uniforms.uTexture.value = radianceRT.rt3.texture;
    if(lpress) displayQuadMesh.material.uniforms.uTexture.value = normalRT.texture;
    if(opress) displayQuadMesh.material.uniforms.uTexture.value = positionRT.texture;
    if(ppress) displayQuadMesh.material.uniforms.uTexture.value = historyRT.rt3.texture;
    if(npress) displayQuadMesh.material.uniforms.uTexture.value = momentMoveRT.texture;
    if(mpress) displayQuadMesh.material.uniforms.uTexture.value = radianceRT.rt1.texture;

    renderer.clear();
    renderer.render(displayScene, camera);
}

let controller;
function initGUI() {

    var gui = new dat.GUI();

    var GUIcontroller = function() {
        this.c_phi = 105;
        this.n_phi = 0.01;
        this.p_phi = 1;

        this.c_phiMultPerIt = 0.34;

        this.stepMultiplier = 1.5;
        this.iterations = 10;

        this.atrous5x5 = false;

        this.maxFramesHistory = 10;
        this.filterHistoryModulation = 0.54;
        this.spp = 3;
        this.mirrorIndex = 1;

        this.lowQuality = function() {
            this.spp = 1;
            this.iterations = 7;
            this.filterHistoryModulation = 0.37;
            this.stepMultiplier = 1.7;
            this.atrous5x5 = false;
            this.maxFramesHistory = 10;
            this.c_phiMultPerIt = 0.34;
            this.c_phi = 105;
            this.n_phi = 0.01;
            this.p_phi = 1;

            this.updateGUI();
        };  

        this.mediumQuality = function() {
            this.spp = 2;
            this.iterations = 8;
            this.c_phiMultPerIt = 0.36;
            this.filterHistoryModulation = 0.42;
            this.stepMultiplier = 1.6;
            this.c_phi = 105;
            this.n_phi = 0.01;
            this.p_phi = 1;
            this.maxFramesHistory = 10;
            this.atrous5x5 = false;

            this.updateGUI();
        };  

        this.highQuality = function() {
            this.c_phi = 105;
            this.n_phi = 0.01;
            this.p_phi = 1;
    
            this.c_phiMultPerIt = 0.34;
    
            this.stepMultiplier = 1.5;
            this.iterations = 10;
    
            this.atrous5x5 = false;
    
            this.maxFramesHistory = 10;
            this.filterHistoryModulation = 0.54;
            this.spp = 3;

            this.updateGUI();
        }

        this.veryHighQuality = function() {
            this.c_phi = 105;
            this.n_phi = 0.01;
            this.p_phi = 1;
    
            this.c_phiMultPerIt = 0.34;
    
            this.stepMultiplier = 1.47;
            this.iterations = 10;
    
            this.atrous5x5 = false;
    
            this.maxFramesHistory = 7;
            this.filterHistoryModulation = 0.35;
            this.spp = 5;

            this.updateGUI();
        }

        this.updateGUI = function() {
            for(let folder in gui.__folders) {
                if(!gui.__folders.hasOwnProperty(folder)) continue;
        
                for(let j = 0; j < gui.__folders[folder].__controllers.length; j++) {
                    let property = gui.__folders[folder].__controllers[j].property;
        
                    if(controller.hasOwnProperty(property)) {
                        gui.__folders[folder].__controllers[j].setValue(controller[property]);
                    }
                }
            }
        };

    };    

    controller = new GUIcontroller();


    var wff = gui.addFolder('Wavelet Filter');
    var ptf = gui.addFolder('Path Tracer');
    var rpf = gui.addFolder('Reprojection Params');
    var qpf = gui.addFolder('Quality Presets');

    wff.add(controller, 'c_phi', 0, 200).onChange(function(value) {
        atrousMaterial.uniforms.uC_phi.value = value;
    });
    wff.add(controller, 'n_phi', 0.01, 30).onChange(function(value) {
        atrousMaterial.uniforms.uN_phi.value = value;
    }); 
    wff.add(controller, 'p_phi', 0, 30).onChange(function(value) {
        atrousMaterial.uniforms.uP_phi.value = value;
    }); 
    wff.add(controller, 'c_phiMultPerIt', 0, 1);
    wff.add(controller, 'stepMultiplier', 0, 5);
    wff.add(controller, 'iterations', 0, 10).step(1);
    wff.add(controller, 'atrous5x5').onChange(function(value) {
        if(value) {
            atrousMaterial.defines = {
                "atrous5x5": true,
            };
        } else {
            atrousMaterial.defines = {
                "atrous3x3": true,
            };
        }

        atrousMaterial.needsUpdate = true;
    });

    ptf.add(controller, 'spp', 1, 10).step(1);
    ptf.add(controller, 'mirrorIndex', 1, 4).step(1);

    rpf.add(controller, 'maxFramesHistory', 0, 100).step(1);
    rpf.add(controller, 'filterHistoryModulation', 0, 1);

    qpf.add(controller, 'lowQuality');
    qpf.add(controller, 'mediumQuality');
    qpf.add(controller, 'highQuality');
    qpf.add(controller, 'veryHighQuality');



    wff.open();
    ptf.open();
    rpf.open();
    qpf.open();
}


let addt = 18;
let tot_triangles = 14 + addt;
makeSceneShaders(tot_triangles);
// let addt = 0;
let randBuffer = [];
let randBufferTransl = [];
for(let i = 0; i < addt; i++) {
    let index = 0; //Math.floor(Math.random() * 4);

    randBuffer.push(Math.random() * 2 - 1, Math.random(), Math.random() * 2 - 1, index);
    randBuffer.push(Math.random() * 2 - 1, Math.random(), Math.random() * 2 - 1, index);
    randBuffer.push(Math.random() * 2 - 1, Math.random(), Math.random() * 2 - 1, index);
}
for(let i = 0; i < addt; i++) {
    randBufferTransl.push(
        Math.random() * 2 - 1, 
        Math.random() * 2 - 1, 
        Math.random() * 2 - 1
    );
}
function createGeometry(time) {
    var geometryCULL = new THREE.BufferGeometry();
    // create a simple square shape. We duplicate the top left and bottom right
    // vertices because each vertex needs to appear once per triangle.
    var verticesCULL = [
        -5, -5, -5, 1,
        -5, +5, -5, 1,
        -5, -5, +5, 1,

        -5, +5, +5, 1,
        -5, -5, +5, 1,
        -5, +5, -5, 1,

        +5, -5, +5, 2,
        +5, +5, -5, 2,
        +5, -5, -5, 2,

        +5, +5, +5, 2,
        +5, +5, -5, 2,
        +5, -5, +5, 2,


        +5, -5, -5, 0,
        -5, -5, -5, 0,
        -5, -5, +5, 0,
        
        +5, -5, +5, 0,
        +5, -5, -5, 0,
        -5, -5, +5, 0,

        +5, +5, -5, 0,
        -5, +5, +5, 0,
        -5, +5, -5, 0,
        
        +5, +5, +5, 0,
        -5, +5, +5, 0,
        +5, +5, -5, 0,

        +5, -5, -5, 3,
        -5, +5, -5, 3,
        -5, -5, -5, 3,

        -5, +5, -5, 3,
        +5, -5, -5, 3,
        +5, +5, -5, 3,

        +5, -5, +5, 0,
        -5, -5, +5, 0,
        -5, +5, +5, 0,

        -5, +5, +5, 0,
        +5, +5, +5, 0,
        +5, -5, +5, 0,

        // light source, will be back-culled
        +3.85, +4.9, -3.85, 15,
        -3.85, +4.9, +3.85, 15,
        -3.85, +4.9, -3.85, 15,
        
        +3.85, +4.9, +3.85, 15,
        -3.85, +4.9, +3.85, 15,
        +3.85, +4.9, -3.85, 15,
    ];


    verticesCULL = new Float32Array(verticesCULL);
    // threejs's vertices wont need the "index" property at the 4th position
    let threeVerticesCULL = [];
    for(let i = 0; i < verticesCULL.length; i+=4) {
        threeVerticesCULL.push(verticesCULL[i+0]);
        threeVerticesCULL.push(verticesCULL[i+1]);
        threeVerticesCULL.push(verticesCULL[i+2]);
    }
    threeVerticesCULL = new Float32Array(threeVerticesCULL);

    var normalsCULL = [];
    for(let i = 0; i < threeVerticesCULL.length; i+=9) {
        let v1 = new THREE.Vector3(threeVerticesCULL[i],   threeVerticesCULL[i+1], threeVerticesCULL[i+2]);
        let v2 = new THREE.Vector3(threeVerticesCULL[i+3], threeVerticesCULL[i+4], threeVerticesCULL[i+5]);
        let v3 = new THREE.Vector3(threeVerticesCULL[i+6], threeVerticesCULL[i+7], threeVerticesCULL[i+8]);

        let v2mv1 = v2.clone().sub(v1);
        let v3mv1 = v3.clone().sub(v1);

        let n = v2mv1.cross(v3mv1).normalize();
        normalsCULL.push(n.x, n.y, n.z);
        normalsCULL.push(n.x, n.y, n.z);
        normalsCULL.push(n.x, n.y, n.z);
    }
    normalsCULL = new Float32Array(normalsCULL);

    // itemSize = 3 because there are 3 values (components) per vertex
    geometryCULL.setAttribute( 'position', new THREE.BufferAttribute( threeVerticesCULL, 3 ) );
    geometryCULL.setAttribute( 'aMaterial', new THREE.BufferAttribute( verticesCULL, 4 ) );
    geometryCULL.setAttribute( 'normal',   new THREE.BufferAttribute( normalsCULL,  3 ) );
   







    // NON-culled geometry
    var geometry = new THREE.BufferGeometry();
    // create a simple square shape. We duplicate the top left and bottom right
    // vertices because each vertex needs to appear once per triangle.
    var vertices = [
       
    ];
    for(let i = 0; i < addt; i++) {
        let scale = 4;
        let transScale = 1;
        let yOffs = -3;


        vertices.push(randBuffer[i*12 + 0]  * scale + randBufferTransl[i * 3 + 0] * transScale);
        vertices.push(randBuffer[i*12 + 1]  * scale + randBufferTransl[i * 3 + 1] * transScale + yOffs + Math.sin(time + randBuffer[i*12 + 1] * 149.8776));
        vertices.push(randBuffer[i*12 + 2]  * scale + randBufferTransl[i * 3 + 2] * transScale);
        vertices.push(randBuffer[i*12 + 3]);
 
        vertices.push(randBuffer[i*12 + 4]  * scale + randBufferTransl[i * 3 + 0] * transScale);
        vertices.push(randBuffer[i*12 + 5]  * scale + randBufferTransl[i * 3 + 1] * transScale + yOffs + Math.sin(time + randBuffer[i*12 + 5] * 149.8776));
        vertices.push(randBuffer[i*12 + 6]  * scale + randBufferTransl[i * 3 + 2] * transScale);
        vertices.push(randBuffer[i*12 + 7]);
 
        vertices.push(randBuffer[i*12 + 8]  * scale + randBufferTransl[i * 3 + 0] * transScale);
        vertices.push(randBuffer[i*12 + 9]  * scale + randBufferTransl[i * 3 + 1] * transScale + yOffs + Math.sin(time + randBuffer[i*12 + 9] * 149.8776));
        vertices.push(randBuffer[i*12 + 10] * scale + randBufferTransl[i * 3 + 2] * transScale);
        vertices.push(randBuffer[i*12 + 11]);

        // vertices[(i+2) * 9 + 1] = vertices[(i+2)*9 + 1] + Math.sin(time + randBuffer[(i+2)*9] + 1.2); 
        // vertices[(i+2) * 9 + 4] = vertices[(i+2)*9 + 4] + Math.sin(time + randBuffer[(i+2)*9] + 3.3);
        // vertices[(i+2) * 9 + 7] = vertices[(i+2)*9 + 7] + Math.sin(time + randBuffer[(i+2)*9] + 23.3);
    }
    vertices = new Float32Array(vertices);
    // threejs's vertices wont need the "index" property at the 4th position
    let threeVertices = [];
    for(let i = 0; i < vertices.length; i+=4) {
        threeVertices.push(vertices[i+0]);
        threeVertices.push(vertices[i+1]);
        threeVertices.push(vertices[i+2]);
    }
    threeVertices = new Float32Array(threeVertices);

    var normals = [];
    for(let i = 0; i < threeVertices.length; i+=9) {
        let v1 = new THREE.Vector3(threeVertices[i],   threeVertices[i+1], threeVertices[i+2]);
        let v2 = new THREE.Vector3(threeVertices[i+3], threeVertices[i+4], threeVertices[i+5]);
        let v3 = new THREE.Vector3(threeVertices[i+6], threeVertices[i+7], threeVertices[i+8]);

        let v2mv1 = v2.clone().sub(v1);
        let v3mv1 = v3.clone().sub(v1);

        let n = v2mv1.cross(v3mv1).normalize();
        normals.push(n.x, n.y, n.z);
        normals.push(n.x, n.y, n.z);
        normals.push(n.x, n.y, n.z);
    }
    normals = new Float32Array(normals);

    // itemSize = 3 because there are 3 values (components) per vertex
    geometry.setAttribute( 'position', new THREE.BufferAttribute( threeVertices, 3 ) );
    geometry.setAttribute( 'aMaterial', new THREE.BufferAttribute( vertices, 4 ) );
    geometry.setAttribute( 'normal',   new THREE.BufferAttribute( normals,  3 ) );














    let uniformGeometry = [];
    for(let i = 0; i < verticesCULL.length; i+=4) {
        uniformGeometry.push(new THREE.Vector4(verticesCULL[i], verticesCULL[i+1], verticesCULL[i+2], verticesCULL[i+3]));
    } 
    for(let i = 0; i < vertices.length; i+=4) {
        uniformGeometry.push(new THREE.Vector4(vertices[i], vertices[i+1], vertices[i+2], vertices[i+3]));
    }

    return {
        uniform: uniformGeometry,
        geometryCULL: geometryCULL,
        geometry: geometry
    };
}

function createMomentGeometry(newgeo, oldgeo) {
    var geometry = new THREE.BufferGeometry();
    geometry.setAttribute( 'position',    new THREE.BufferAttribute( newgeo.attributes.position.array, 3 ));
    geometry.setAttribute( 'oldPosition', new THREE.BufferAttribute( oldgeo.attributes.position.array, 3 ));
    
    return geometry;
}