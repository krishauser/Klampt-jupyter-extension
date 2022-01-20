(self["webpackChunkklampt_jupyter_widget"] = self["webpackChunkklampt_jupyter_widget"] || []).push([["lib_widget_js"],{

/***/ "./lib/KlamptFrontend.js":
/*!*******************************!*\
  !*** ./lib/KlamptFrontend.js ***!
  \*******************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

///Depends on THREE (three.js)
///
///API:
///frontend = new KlamptFrontend(sceneArea);        //constructor
///KlamptFrontend.resize(w,h);           //set the width/height
///KlamptFrontend.set_shadow(enabled);   //turns shadows on/off
///KlamptFrontend.update_scene(scene);   //from a JSON message either requesting a whole scene, just a scene update, and possible RPC calls, updates the scene
///KlamptFrontend.reset_scene();         //deletes evertyhing in the scene
///KlamptFrontend.rpc(request);          //performs an RPC call from a kviz request object
///KlamptFrontend.get_camera();          ///returns the current camera
///KlamptFrontend.reset_camera();
///
///RPC calls are designed to be idempotent.
///
///Current RPC calls:
///(note: ? that updates can be called with or without the given item.  =value indicates that a default value is used if the argument is not specified.)
///- set_camera(position?,target?,up?,near?,far?);
///- clear_extras()
///- remove(object)
///- set_color(object,rgba)
///- set_visible(object,value)
///- set_transform(object,matrix)
///- add_text(name,x?,y?,text?)
///- add_ghost(prefix_name,object)
///- add_sphere(name,x?,y?,z?,r?)
///- add_line(name,verts,width=1)
///- add_xform(name,length,width=1)
///- add_trilist(name,verts)
///- add_trimesh(name,verts,indices)
///- add_points(name,verts,colors=null,size=1)
///- add_billboard(name,image,size,filter,colormap)
///    OR
///  add_billboard(name,imagedata,w,h,size,filter,colormap)
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.KlamptFrontend = void 0;
const THREE = __importStar(__webpack_require__(/*! three */ "./node_modules/three/build/three.module.js"));
const three_trackballcontrols_ts_1 = __webpack_require__(/*! three-trackballcontrols-ts */ "webpack/sharing/consume/default/three-trackballcontrols-ts/three-trackballcontrols-ts");
function is_undefined_or_null(x) {
    return (typeof x === 'undefined' || x === null);
}
function _power_of_2(n) {
    return (n != 0) && (n & (n - 1)) == 0;
}
function onRemove(element, callback) {
    const parent = element.parentNode;
    if (!parent)
        throw new Error("The node must already be attached");
    const obs = new MutationObserver(mutations => {
        for (const mutation of mutations) {
            for (let el in mutation.removedNodes) {
                if (mutation.removedNodes[el] === element) {
                    obs.disconnect();
                    callback();
                }
            }
        }
    });
    obs.observe(parent, {
        childList: true,
    });
}
class KlamptFrontend {
    constructor(dom_sceneArea) {
        //the DOM element containing the scene
        this.sceneArea = dom_sceneArea;
        this.extras = new THREE.Group();
        this.sceneCache = {};
        this.width = 300;
        this.height = 150;
        this.scene = new THREE.Scene();
        this.renderer = new THREE.WebGLRenderer();
        //this.renderer = new THREE.WebGLRenderer({
        //  preserveDrawingBuffer   : true   // required to support .toDataURL()
        //});  
        this.loader = new THREE.ObjectLoader();
        this.sceneArea = dom_sceneArea;
        //renderer.setClearColor(0x88888888);
        this.renderer.setClearColor(0x888888FF);
        this.renderer.shadowMap.enabled = true;
        // to antialias the shadow
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        while (dom_sceneArea.firstChild) {
            dom_sceneArea.removeChild(dom_sceneArea.firstChild);
        }
        dom_sceneArea.appendChild(this.renderer.domElement); //attach the three.js renderer to the proper div 
        this.cameraCallback = null;
        this.animating = false;
        this.reset_camera();
        this.reset_scene();
        onRemove(dom_sceneArea, this.close.bind(this));
        window.addEventListener('resize', this);
        var _this = this;
        let initBind = function () {
            if (_this.sceneArea.clientWidth != 0 || _this.sceneArea.offsetWidth != 0) {
                _this.resize(_this.sceneArea.clientWidth, _this.sceneArea.clientHeight);
                _this.controls.update();
                _this.render();
            }
            else {
                setTimeout(initBind, 10);
            }
        };
        setTimeout(initBind, 0);
    }
    handleEvent(event) {
        if (event.type == 'resize') {
            if (this.sceneArea.clientWidth != 0) {
                this.resize(this.sceneArea.clientWidth, this.sceneArea.clientHeight);
            }
        }
    }
    close() {
        console.log("Closing KlamptFrontend");
        this.animating = false;
        window.removeEventListener('resize', this);
        this.controls.dispose();
        this.reset_scene();
    }
    set_shadow(enabled) {
        this.renderer.shadowMap.enabled = enabled;
    }
    resize(w, h) {
        console.log("KLAMPT.resize width: " + w + " height: " + h);
        this.width = w; //account for 5px padding on each side
        this.height = h;
        this.renderer.setSize(this.width, this.height);
        this.camera.aspect = this.width / this.height;
        this.camera.updateProjectionMatrix();
        this.controls.handleResize();
        this.render();
    }
    addObject(name, object) {
        object.name = name;
        this.sceneCache[name] = object;
        this.extras.add(object);
    }
    getObject(name) {
        let object = this.sceneCache[name];
        if (object == null) {
            let object2 = this.scene.getObjectByName(name);
            if (object2 != null) {
                this.sceneCache[name] = object2;
            }
            return object2;
        }
        return object;
    }
    removeObject(name) {
        let obj = this.getObject(name);
        if (obj) {
            if (name in this.sceneCache) {
                delete this.sceneCache[name];
            }
            let meshobj = obj;
            if (!is_undefined_or_null(meshobj.geometry))
                meshobj.geometry.dispose();
            if (!is_undefined_or_null(meshobj.material))
                meshobj.material.dispose();
            obj.visible = false;
            if (obj.parent != null)
                obj.parent.remove(obj);
        }
        else {
            let obj2 = this.sceneArea.querySelector("#_text_overlay_" + name);
            if (obj2 != null) {
                if (obj2.parentNode != null)
                    obj2.parentNode.removeChild(obj2);
            }
            else {
                console.log("KLAMPT.rpc: Item to be removed " + name + " not found");
            }
        }
    }
    //dataJ has a Three.js scene object format
    _set_scene(dataJ) {
        this.scene.traverse(function (child) {
            let meshchild = child;
            if (!is_undefined_or_null(meshchild.geometry))
                meshchild.geometry.dispose();
            if (!is_undefined_or_null(meshchild.material))
                meshchild.material.dispose();
        });
        this.sceneCache = {};
        this.scene = this.loader.parse(dataJ);
        if (this.scene == null) {
            console.log("KLAMPT.update_scene: Invalid scene sent from server");
            this.scene = new THREE.Scene();
        }
        let newItems;
        newItems = [];
        this.scene.traverse(function (child) {
            if (!(child instanceof THREE.Light)) {
                let meshchild = child;
                if (!is_undefined_or_null(meshchild.geometry)) {
                    if (meshchild.geometry instanceof THREE.Geometry) {
                        meshchild.geometry.computeFaceNormals();
                        console.log("Geometry: normals of " + child.name + " calculated\n");
                    }
                    else if (child instanceof THREE.Points) {
                        //no normals needed here
                    }
                    else if (meshchild.geometry instanceof THREE.BufferGeometry) {
                        if (is_undefined_or_null(meshchild.geometry.attributes.normal)) { //need to compute normals
                            console.log("BufferGeometry: Computing normals of " + child.name + " from triangles\n");
                            let positions = meshchild.geometry.attributes["position"];
                            if (meshchild.geometry.index == null)
                                return;
                            let indices = meshchild.geometry.index.array;
                            let normals = new Float32Array(positions.array.length);
                            for (let i = 0; i < positions.array.length; i++)
                                normals[i] = 0.0;
                            let vba = new THREE.Vector3();
                            let vca = new THREE.Vector3();
                            let vn = new THREE.Vector3();
                            for (let tri = 0; tri < indices.length; tri += 3) {
                                let a = indices[tri];
                                let b = indices[tri + 1];
                                let c = indices[tri + 2];
                                vba.x = positions.array[b * 3] - positions.array[a * 3];
                                vba.y = positions.array[b * 3 + 1] - positions.array[a * 3 + 1];
                                vba.z = positions.array[b * 3 + 2] - positions.array[a * 3 + 2];
                                vca.x = positions.array[c * 3] - positions.array[a * 3];
                                vca.y = positions.array[c * 3 + 1] - positions.array[a * 3 + 1];
                                vca.z = positions.array[c * 3 + 2] - positions.array[a * 3 + 2];
                                vn.crossVectors(vba, vca);
                                vn.normalize();
                                normals[a * 3] += vn.x;
                                normals[a * 3 + 1] += vn.y;
                                normals[a * 3 + 2] += vn.z;
                                normals[b * 3] += vn.x;
                                normals[b * 3 + 1] += vn.y;
                                normals[b * 3 + 2] += vn.z;
                                normals[c * 3] += vn.x;
                                normals[c * 3 + 1] += vn.y;
                                normals[c * 3 + 2] += vn.z;
                            }
                            for (let i = 0; i < positions.array.length; i += 3) {
                                vn.x = normals[i];
                                vn.y = normals[i + 1];
                                vn.z = normals[i + 2];
                                vn.normalize();
                                normals[i] = vn.x;
                                normals[i + 1] = vn.y;
                                normals[i + 2] = vn.z;
                            }
                            meshchild.geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
                        }
                        else {
                            console.log("BufferGeometry Item " + child.name + " already has normals\n");
                        }
                    }
                    else {
                        console.log("Item " + child.name + " is neither a geometry or THREE.BufferGeometry\n");
                    }
                }
                if (child.name == "Terrain") {
                    child.receiveShadow = true;
                    child.castShadow = true;
                }
                else {
                    child.receiveShadow = true;
                    child.castShadow = true;
                }
            }
            else if (child instanceof THREE.DirectionalLight || child instanceof THREE.SpotLight) {
                child.intensity *= 0.8;
                child.castShadow = true;
                //child.shadow.darkness = 0.3;
                if (child instanceof THREE.DirectionalLight) {
                    //child.position.set( 0, 0, 10 ); 
                    //child.shadow.camera.fov = 50;
                    child.shadow.bias = -0.00001;
                    child.shadow.mapSize.x = 1024;
                    child.shadow.mapSize.y = 1024;
                    child.shadow.camera.right = 5;
                    child.shadow.camera.left = -5;
                    child.shadow.camera.top = 5;
                    child.shadow.camera.bottom = -5;
                    /*
                    let helper = new THREE.CameraHelper( light.shadow.camera );
                    newItems.push( helper );
          
                    //hack for non-black shadows
                    let shadowIntensity = 0.3;
                    let light2 = child.clone();
                    child.castShadow = false;
                    light2.intensity = shadowIntensity;
                    child.intensity = child.intensity - shadowIntensity;
                    newItems.push(light2);
                    */
                }
            }
        });
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.2));
        for (let i = 0; i < newItems.length; i++)
            this.scene.add(newItems[i]);
        let AxesHelper = new THREE.AxesHelper(0.2);
        let linemat = AxesHelper.material;
        linemat.linewidth = 2.0;
        this.scene.add(AxesHelper);
        this.extras = new THREE.Group();
        this.scene.add(this.extras);
    }
    ///sceneObjects is a list of dictionaries, each containing the members "name" and "matrix"
    _set_transforms(sceneObjects) {
        for (let i = 0; i < sceneObjects.length; i++) {
            //console.log("Update requested to: " + sceneObjects[i].name);
            //console.log("  new matrix is: " + sceneObjects[i].matrix);
            let object = this.getObject(sceneObjects[i].name);
            if (object != null) {
                //console.log("  we found \"" + sceneObjects[i].name + "\" in the Three.js scene");
                object.matrixAutoUpdate = false;
                object.matrixWorldNeedsUpdate = true;
                let m = sceneObjects[i].matrix;
                object.matrix.set(m[0], m[4], m[8], m[12], m[1], m[5], m[9], m[13], m[2], m[6], m[10], m[14], m[3], m[7], m[11], m[15]);
            }
            else {
                console.log("KLAMPT.update_scene: Did not find \"" + sceneObjects[i].name + "\" in the Three.js scene");
            }
        }
    }
    _setupBillboard(name, texture, size) {
        let material;
        if (!_power_of_2(texture.image.width) || !_power_of_2(texture.image.height)) {
            console.log("Warning, texture does not have a power of two width / height: " + texture.image.width + "," + texture.image.height);
            return;
        }
        else {
            if (texture.format == THREE.AlphaFormat || texture.format == THREE.LuminanceFormat) {
                material = new THREE.MeshBasicMaterial({
                    alphaMap: texture,
                    transparent: true,
                    opacity: 1
                });
            }
            else {
                material = new THREE.MeshBasicMaterial({
                    map: texture
                });
            }
        }
        let obj = this.getObject(name);
        let meshobj = obj;
        meshobj.material = material;
        meshobj.material.needsUpdate = true;
    }
    rpc(request) {
        if (request.type == 'set_camera') {
            let data = request;
            if (data.up !== undefined) {
                this.camera.up.x = data.up.x;
                this.camera.up.y = data.up.y;
                this.camera.up.z = data.up.z;
            }
            if (data.target !== undefined) {
                this.controls.target.x = data.target.x;
                this.controls.target.y = data.target.y;
                this.controls.target.z = data.target.z;
            }
            if (data.position !== undefined) {
                this.camera.position.x = data.position.x;
                this.camera.position.y = data.position.y;
                this.camera.position.z = data.position.z;
            }
            if (data.near !== undefined) {
                this.camera.near = data.near;
            }
            if (data.far !== undefined) {
                this.camera.far = data.far;
            }
            this.controls.update();
        }
        else if (request.type == "clear_extras") {
            //clear scene
            var _this = this;
            this.extras.traverse(function (child) {
                if (!is_undefined_or_null(child.name) && child.name in _this.sceneCache)
                    delete _this.sceneCache[child.name];
                let meshchild = child;
                if (!is_undefined_or_null(meshchild.geometry))
                    meshchild.geometry.dispose();
                if (!is_undefined_or_null(meshchild.material))
                    meshchild.material.dispose();
            });
            this.scene.remove(this.extras);
            this.extras = new THREE.Group();
            this.scene.add(this.extras);
            //clear text
            let overlayList = [];
            for (let i = 0; i < this.sceneArea.children.length; i++) {
                if (this.sceneArea.children[i].id.startsWith("_text_overlay_")) {
                    overlayList.push(this.sceneArea.children[i]);
                    //console.log("Removing text item "+sceneArea.children[i].id);
                }
            }
            for (let i = 0; i < overlayList.length; i++) {
                //console.log("Clearing text "+overlayList[i].id);
                this.sceneArea.removeChild(overlayList[i]);
            }
        }
        else if (request.type == "remove") {
            //remove object from scene
            //console.log("Removing item "+request.object);
            this.removeObject(request.object);
        }
        else if (request.type == "set_color") {
            let object_name = request.object;
            let rgba = request.rgba;
            let recursive = request.recursive;
            //console.log("set_color requested. object: " + object_name + " rgba: " + rgba); 
            let obj = this.getObject(object_name);
            if (obj == null) {
                console.log("KLAMPT.rpc: Invalid object name " + object_name + " specified in set_color");
            }
            else {
                let shared = (is_undefined_or_null(obj.userData.customSharedMaterialSetup));
                //if(!is_undefined_or_null(typeof object.material))
                //{
                //  console.log("first checking if we've working this this material before");
                let mobj = obj;
                if (recursive == true) {
                    if (is_undefined_or_null(mobj.material)) {
                        mobj.material = new THREE.MeshPhongMaterial();
                        mobj.userData.customSharedMaterialSetup = true;
                    }
                    else if (shared) {
                        mobj.material = mobj.material.clone();
                        mobj.userData.customSharedMaterialSetup = true;
                    }
                    mobj.traverse(function (child) {
                        let mchild = child;
                        if (!is_undefined_or_null(mchild.material)) {
                            let cshared = (is_undefined_or_null(child.userData.customSharedMaterialSetup));
                            if (!cshared) {
                                mchild.material.dispose();
                            }
                            mchild.material = mobj.material;
                        }
                    });
                }
                else {
                    if (mobj.material == null) {
                        mobj.material = new THREE.MeshPhongMaterial();
                        mobj.userData.customSingleMaterialSetup = true;
                    }
                    else if (shared) {
                        mobj.material = mobj.material.clone();
                        mobj.userData.customSingleMaterialSetup = false;
                    }
                }
                let mat = mobj.material;
                mat.color.setRGB(rgba[0], rgba[1], rgba[2]);
                if (rgba[3] != 1.0) {
                    mat.transparent = true;
                    mat.opacity = rgba[3];
                }
                else {
                    if (mat.alphaMap != null)
                        mat.transparent = true;
                    else
                        mat.transparent = false;
                }
                //}
                //else
                //{
                //   console.log("ERROR: no material associated with object: " + object_name);  
                //   alert("ERROR: kviz.set_color is trying to set an object with no material");
                //}
            }
        }
        else if (request.type == "set_visible") {
            let object_name = request.object;
            let visible = request.value;
            //console.log("set_visible requested. object: " + object_name + " visible: " + visible); 
            let object = this.getObject(object_name);
            if (object == null) {
                console.log("KLAMPT.rpc: Invalid object name " + object_name + " specified in set_visible");
            }
            else {
                object.visible = visible;
            }
        }
        else if (request.type == "add_ghost") {
            let object_name = request.object;
            let prefix = request.prefix_name;
            //console.log("add_ghost requested. object: " + object_name + " prefix: " + prefix); 
            let old_ghost = this.getObject(prefix + object_name);
            if (old_ghost == null) {
                let object = this.getObject(object_name);
                if (object != null) {
                    let clone_object = object.clone(true);
                    clone_object.traverse(function (child) {
                        if (!is_undefined_or_null(child.name)) {
                            child.name = prefix + child.name;
                        }
                        //ghosts should not cast shadows
                        if (!is_undefined_or_null(child.castShadow)) {
                            child.castShadow = false;
                            child.receiveShadow = false;
                        }
                    });
                    this.addObject(prefix + object_name, clone_object);
                    console.log("KLAMPT.rpc: Added ghost with name " + prefix + object_name);
                }
                else {
                    console.log("KLAMPT.rpc: The ghost of object " + object_name + " could not be made since the object was not found");
                }
            }
            else {
                //there's already a ghost with that name... should we re-clone?
            }
        }
        else if (request.type == "set_transform") {
            //console.log("KLAMPT.rpc: got a set_transform RPC request for: " + request.object);
            let object = this.getObject(request.object);
            if (object != null) {
                if (object.matrix) {
                    object.matrixAutoUpdate = false;
                    object.matrixWorldNeedsUpdate = true;
                    let m = request.matrix;
                    object.matrix.set(m[0], m[1], m[2], m[3], m[4], m[5], m[6], m[7], m[8], m[9], m[10], m[11], m[12], m[13], m[14], m[15]);
                }
                else
                    console.log("KLAMPT.rpc: object does not have matrix property: " + request.object);
            }
            else
                console.log("KLAMPT.rpc: couldn't find object: " + request.object);
        }
        else if (request.type == "add_text") {
            //console.log("RPC to add text!");   
            let text2 = this.sceneArea.querySelector("#_text_overlay_" + request.name);
            if (text2 == null) {
                let text3 = document.createElement('div');
                text3.style.position = 'absolute';
                text3.id = "_text_overlay_" + request.name;
                text3.style.zIndex = "1"; // if you still don't see the label, try uncommenting this
                //text2.style.width = 100;
                //text2.style.height = 100;
                //text2.style.backgroundColor = "blue";
                if (request.text != null)
                    text3.innerHTML = request.text;
                text3.style.top = request.y + '%';
                text3.style.left = request.x + '%';
                this.sceneArea.appendChild(text3);
            }
            else {
                if (!is_undefined_or_null(request.text))
                    text2.innerHTML = request.text;
                if (!is_undefined_or_null(request.x))
                    text2.style.left = request.x + '%';
                if (!is_undefined_or_null(request.y))
                    text2.style.top = request.y + '%';
            }
        }
        else if (request.type == "add_sphere") {
            let sphere = this.getObject(request.name);
            if (sphere == null) {
                //console.log("RPC to add sphere!"); 
                let slices = 20;
                if (request.r < 0.05)
                    slices = 6;
                else if (request.r < 0.2)
                    slices = 12;
                let geometry = new THREE.SphereGeometry(1.0, slices, slices);
                let material = new THREE.MeshPhongMaterial({ color: 0xAA0000 });
                let sphere2 = new THREE.Mesh(geometry, material);
                sphere2.userData.customSharedMaterialSetup = true;
                sphere2.castShadow = true;
                sphere2.scale.x = request.r;
                sphere2.scale.y = request.r;
                sphere2.scale.z = request.r;
                sphere2.position.set(request.x, request.y, request.z);
                this.addObject(request.name, sphere2);
            }
            else {
                if (!is_undefined_or_null(request.x)) {
                    sphere.position.set(request.x, request.y, request.z);
                }
                if (!is_undefined_or_null(request.r) && request.r > 0) {
                    sphere.scale.x = request.r;
                    sphere.scale.y = request.r;
                    sphere.scale.z = request.r;
                }
            }
        }
        else if (request.type == "add_line") {
            let obj = this.getObject(request.name);
            if (obj == null) {
                let geometry = new THREE.Geometry();
                for (let i = 0; i < request.verts.length; i += 3) {
                    geometry.vertices.push(new THREE.Vector3(request.verts[i], request.verts[i + 1], request.verts[i + 2]));
                }
                //geometry.dynamic  = true;
                let material = new THREE.LineBasicMaterial({ color: 0xAA0000 });
                if (!is_undefined_or_null(request.width)) {
                    material.linewidth = request.width;
                }
                let line = new THREE.Line(geometry, material);
                line.userData.customSharedMaterialSetup = true;
                this.addObject(request.name, line);
            }
            else {
                let line = obj;
                let lgeom = line.geometry;
                lgeom.vertices = [];
                for (let i = 0; i < request.verts.length; i += 3) {
                    lgeom.vertices.push(new THREE.Vector3(request.verts[i], request.verts[i + 1], request.verts[i + 2]));
                }
                lgeom.verticesNeedUpdate = true;
            }
        }
        else if (request.type == "add_xform") {
            let xform = this.getObject(request.name);
            if (xform != null)
                this.removeObject(request.name);
            let axis = new THREE.AxesHelper(request.length);
            if (!is_undefined_or_null(request.width))
                axis.material.linewidth = request.width;
            this.addObject(request.name, axis);
        }
        else if (request.type == 'add_trilist') {
            let obj = this.getObject(request.name);
            if (obj == null) {
                let geom = new THREE.Geometry();
                //geom.dynamic = true;
                for (let i = 0; i < request.verts.length; i += 3) {
                    geom.vertices.push(new THREE.Vector3(request.verts[i], request.verts[i + 1], request.verts[i + 2]));
                }
                for (let i = 0; i < request.verts.length; i += 9) {
                    geom.faces.push(new THREE.Face3(i / 3, i / 3 + 1, i / 3 + 2));
                }
                geom.computeFaceNormals();
                let mesh = new THREE.Mesh(geom, new THREE.MeshPhongMaterial());
                mesh.castShadow = true;
                mesh.userData.customSharedMaterialSetup = true;
                this.addObject(request.name, mesh);
            }
            else {
                let mobj = obj;
                if (request.verts.length != mobj.geometry.vertices.length * 3 || true) {
                    //might as well just completely recreate the geometry
                    mobj.geometry.dispose();
                    let geom = new THREE.Geometry();
                    //geom.dynamic = true;
                    for (let i = 0; i < request.verts.length; i += 3) {
                        geom.vertices.push(new THREE.Vector3(request.verts[i], request.verts[i + 1], request.verts[i + 2]));
                    }
                    for (let i = 0; i < request.verts.length; i += 9) {
                        geom.faces.push(new THREE.Face3(i / 3, i / 3 + 1, i / 3 + 2));
                    }
                    geom.computeFaceNormals();
                    mobj.geometry = geom;
                }
                else {}
            }
        }
        else if (request.type == 'add_trimesh') {
            let obj = this.getObject(request.name);
            if (obj == null) {
                let geom = new THREE.Geometry();
                //geom.dynamic = true;
                for (let i = 0; i < request.verts.length; i += 3) {
                    geom.vertices.push(new THREE.Vector3(request.verts[i], request.verts[i + 1], request.verts[i + 2]));
                }
                for (let i = 0; i < request.tris.length; i += 3) {
                    geom.faces.push(new THREE.Face3(request.tris[i], request.tris[i + 1], request.tris[i + 2]));
                }
                geom.computeFaceNormals();
                let mesh = new THREE.Mesh(geom, new THREE.MeshPhongMaterial());
                mesh.castShadow = true;
                mesh.userData.customSharedMaterialSetup = true;
                this.addObject(request.name, mesh);
            }
            else {
                let mobj = obj;
                if (request.verts.length != mobj.geometry.vertices.length * 3 || true) {
                    //might as well just completely recreate the geometry
                    mobj.geometry.dispose();
                    let geom = new THREE.Geometry();
                    //geom.dynamic = true;
                    for (let i = 0; i < request.verts.length; i += 3) {
                        geom.vertices.push(new THREE.Vector3(request.verts[i], request.verts[i + 1], request.verts[i + 2]));
                    }
                    for (let i = 0; i < request.tris.length; i += 3) {
                        geom.faces.push(new THREE.Face3(request.tris[i], request.tris[i + 1], request.tris[i + 2]));
                    }
                    geom.computeFaceNormals();
                    mobj.geometry = geom;
                }
                else {}
            }
        }
        else if (request.type == 'add_points') {
            let obj = this.getObject(request.name);
            if (obj == null) {
                let geom = new THREE.Geometry();
                //geom.dynamic = true;
                for (let i = 0; i < request.verts.length; i += 3) {
                    geom.vertices.push(new THREE.Vector3(request.verts[i], request.verts[i + 1], request.verts[i + 2]));
                }
                let mat = new THREE.PointsMaterial();
                if (request.size)
                    mat.size = request.size;
                else
                    mat.size = 1;
                if (request.colors) {
                    mat.vertexColors = true;
                    for (let i = 0; i < request.colors.length; i++) {
                        geom.colors.push(new THREE.Color(request.colors[i]));
                    }
                }
                else {
                    mat.color = new THREE.Color(0xffffff);
                }
                let pts = new THREE.Points(geom, mat);
                pts.castShadow = false;
                pts.userData.customSharedMaterialSetup = true;
                this.addObject(request.name, pts);
            }
            else {
                let mobj = obj;
                if (request.verts.length != mobj.geometry.vertices.length * 3 || true) {
                    //might as well just completely recreate the geometry
                    mobj.geometry.dispose();
                    let geom = new THREE.Geometry();
                    //geom.dynamic = true;
                    for (let i = 0; i < request.verts.length; i += 3) {
                        geom.vertices.push(new THREE.Vector3(request.verts[i], request.verts[i + 1], request.verts[i + 2]));
                    }
                    if (request.colors) {
                        mobj.material.vertexColors = true;
                        for (let i = 0; i < request.colors.length; i++) {
                            geom.colors.push(new THREE.Color(request.colors[i]));
                        }
                    }
                    else {
                        mobj.material.vertexColors = false;
                    }
                    mobj.geometry = geom;
                }
                else {}
            }
        }
        else if (request.type == 'add_billboard') {
            let size = request.size;
            let geom = new THREE.Geometry();
            geom.vertices.push(new THREE.Vector3(-size[0] * 0.5, -size[1] * 0.5, 0));
            geom.vertices.push(new THREE.Vector3(size[0] * 0.5, -size[1] * 0.5, 0));
            geom.vertices.push(new THREE.Vector3(size[0] * 0.5, size[1] * 0.5, 0));
            geom.vertices.push(new THREE.Vector3(-size[0] * 0.5, size[1] * 0.5, 0));
            geom.faces.push(new THREE.Face3(0, 1, 2));
            geom.faces.push(new THREE.Face3(0, 2, 3));
            geom.faceVertexUvs[0] = [];
            geom.faceVertexUvs[0][0] = [new THREE.Vector2(0, 1), new THREE.Vector2(1, 1), new THREE.Vector2(1, 0)];
            geom.faceVertexUvs[0][1] = [new THREE.Vector2(0, 1), new THREE.Vector2(1, 0), new THREE.Vector2(0, 0)];
            geom.computeFaceNormals();
            geom.uvsNeedUpdate = true;
            let mesh = new THREE.Mesh(geom, new THREE.MeshBasicMaterial());
            mesh.userData.customSharedMaterialSetup = true;
            this.addObject(request.name, mesh);
            let filter = request.filter;
            let colormap = request.colormap;
            if (filter == 'nearest')
                filter = THREE.NearestFilter;
            else
                filter = THREE.LinearFilter;
            if (request.imagedata) {
                //load from data
                let w = request.width;
                let h = request.height;
                let data = atob(request.imagedata);
                let format = THREE.LuminanceFormat;
                if (colormap == 'opacity')
                    format = THREE.LuminanceFormat; //AlphaFormat;
                if (data.length == 3 * w * h)
                    format = THREE.RGBFormat;
                else if (data.length == 4 * w * h)
                    format = THREE.RGBAFormat;
                else {
                    if (data.length != w * h) {
                        console.log("KLAMPT.rpc: Invalid image data length? " + data.length);
                        return;
                    }
                }
                let buffer = new Uint8Array(new ArrayBuffer(data.length));
                for (let i = 0; i < data.length; i++) {
                    buffer[i] = data.charCodeAt(i);
                }
                let tex = new THREE.DataTexture(buffer, w, h, format, THREE.UnsignedByteType);
                tex.needsUpdate = true;
                //tex.minFilter = filter;
                //tex.magFilter = filter;
                this._setupBillboard(request.name, tex, size);
            }
            else {
                //load from image
                // instantiate a loader
                let loader = new THREE.TextureLoader();
                var _this = this;
                // load a resource
                loader.load(
                // resource URL
                request.image, 
                // Function when resource is loaded
                function (texture) {
                    texture.minFilter = filter;
                    texture.magFilter = filter;
                    _this._setupBillboard(request.name, texture, size);
                }, 
                // Function called when download progresses
                function (xhr) {
                    console.log((xhr.loaded / xhr.total * 100) + '% loaded');
                }, 
                // Function called when download errors
                function (xhr) {
                    console.log('An error happened');
                });
            }
            //create the billboard geometry
        }
        else {
            console.log("KLAMPT.rpc: Invalid request: " + request.type);
        }
    }
    reset_scene() {
        this.scene.traverse(function (child) {
            if (!is_undefined_or_null(child.geometry))
                child.geometry.dispose();
            if (!is_undefined_or_null(child.material))
                child.material.dispose();
        });
        for (let i = this.scene.children.length - 1; i >= 0; i--) {
            this.scene.remove(this.scene.children[i]);
        }
        this.sceneCache = {};
        //clear anything named _text_overlay_X
        let overlayList = [];
        for (let i = 0; i < this.sceneArea.children.length; i++) {
            if (this.sceneArea.children[i].id.startsWith("_text_overlay_")) {
                overlayList.push(this.sceneArea.children[i]);
                //console.log("Removing text item "+sceneArea.children[i].id);
            }
        }
        for (let i = 0; i < overlayList.length; i++) {
            this.sceneArea.removeChild(overlayList[i]);
        }
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.2));
        this.scene.add(new THREE.DirectionalLight(0xffffff, 0.9));
        let AxesHelper = new THREE.AxesHelper(0.2);
        this.scene.add(AxesHelper);
        this.extras = new THREE.Group();
        this.scene.add(this.extras);
    }
    update_scene(data) {
        //console.log("new scene has arrived!");
        //let dataJ=JSON.parse(data); 
        let dataJ = data;
        if (dataJ == null) {
            console.log("KLAMPT.update_scene: Unable to parse scene JSON!");
            //console.log(data);
            return;
        }
        //need to determine if full scene or just transforms
        let isFullScene = dataJ.metadata.fullscene;
        //console.log("full scene is: " + isFullScene);
        if (isFullScene) {
            //let t0 = performance.now();
            this._set_scene(dataJ);
            //console.log("Call to load scene " + (t1 - t0) + " milliseconds.")
            //scene.traverse ( function (child) {
            //  console.log("found: " + child.name);
            //});
        }
        else //just apply transforms
         {
            //let t0 = performance.now();
            this._set_transforms(dataJ.object);
            //let t1 = performance.now();
            //console.log("Call to load tranforms " + (t1 - t0) + " milliseconds.");
        }
        let rpc = dataJ.RPC;
        if (rpc) {
            //let t1 = performance.now();
            for (let i = 0; i < rpc.length; i++) {
                try {
                    this.rpc(rpc[i]);
                }
                catch (err) {
                    console.log(rpc[i]);
                    throw err;
                }
            }
            //let t2 = performance.now();
            if (rpc.length > 0) {
                //console.log("Call to do RPC's " + (t2 - t1) + " milliseconds.")
            }
        }
    }
    render() {
        this.renderer.render(this.scene, this.camera);
    }
    reset_camera() {
        this.camera = new THREE.PerspectiveCamera(45, this.width / this.height, 0.1, 1000);
        this.camera.position.z = 6;
        this.camera.position.y = 3;
        if (this.controls != null)
            this.controls.dispose();
        this.controls = new three_trackballcontrols_ts_1.TrackballControls(this.camera, this.sceneArea);
        this.controls.enabled = true;
        this.controls.rotateSpeed = 1.0;
        this.controls.zoomSpeed = 1.2;
        this.controls.panSpeed = 0.8;
        this.controls.noZoom = false;
        this.controls.noPan = false;
        this.controls.staticMoving = true;
        this.controls.dynamicDampingFactor = 0.3;
        this.controls.keys = [65, 83, 68];
        this.controls.addEventListener('change', this._on_camera_change.bind(this));
        this.controls.addEventListener('start', this._on_camera_move_start.bind(this));
        this.controls.addEventListener('end', this._on_camera_move_stop.bind(this));
    }
    _on_camera_move_start() {
        if (!this.animating) {
            this.animating = true;
            this.animationLoop();
        }
    }
    _on_camera_move_stop() {
        this.animating = false;
    }
    animationLoop() {
        this.controls.update();
        if (this.animating)
            setTimeout(this.animationLoop.bind(this), 20);
    }
    _on_camera_change() {
        this.render();
        if (this.cameraCallback != null) {
            //console.log("camera change, with callback");
            this.cameraCallback();
        }
        else {
            //console.log("camera change, W/O callback");
        }
    }
    set_camera_callback(cb) {
        this.cameraCallback = cb;
    }
    get_camera() {
        return { up: this.camera.up, target: this.controls.target, position: this.camera.position, near: this.camera.near, far: this.camera.far };
    }
    set_camera(data) {
        this.camera.up.x = data.up.x;
        this.camera.up.y = data.up.y;
        this.camera.up.z = data.up.z;
        this.controls.target.x = data.target.x;
        this.controls.target.y = data.target.y;
        this.controls.target.z = data.target.z;
        this.camera.position.x = data.position.x;
        this.camera.position.y = data.position.y;
        this.camera.position.z = data.position.z;
        this.camera.near = data.near;
        this.camera.far = data.far;
        this.controls.update();
    }
}
exports.KlamptFrontend = KlamptFrontend;
;
//# sourceMappingURL=KlamptFrontend.js.map

/***/ }),

/***/ "./lib/version.js":
/*!************************!*\
  !*** ./lib/version.js ***!
  \************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

// Copyright (c) Kris Hauser
// Distributed under the terms of the Modified BSD License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.MODULE_NAME = exports.MODULE_VERSION = void 0;
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
// eslint-disable-next-line @typescript-eslint/no-var-requires
const data = __webpack_require__(/*! ../package.json */ "./package.json");
/**
 * The _model_module_version/_view_module_version this package implements.
 *
 * The html widget manager assumes that this is the same as the npm package
 * version number.
 */
exports.MODULE_VERSION = data.version;
/*
 * The current package name.
 */
exports.MODULE_NAME = data.name;
//# sourceMappingURL=version.js.map

/***/ }),

/***/ "./lib/widget.js":
/*!***********************!*\
  !*** ./lib/widget.js ***!
  \***********************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

// Copyright (c) Kris Hauser
// Distributed under the terms of the Modified BSD License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.KlamptView = exports.KlamptModel = void 0;
const base_1 = __webpack_require__(/*! @jupyter-widgets/base */ "webpack/sharing/consume/default/@jupyter-widgets/base");
const version_1 = __webpack_require__(/*! ./version */ "./lib/version.js");
const KlamptFrontend_1 = __webpack_require__(/*! ./KlamptFrontend */ "./lib/KlamptFrontend.js");
// Import the CSS
__webpack_require__(/*! ../css/widget.css */ "./css/widget.css");
function isEmpty(ob) {
    // @ts-ignore
    for (var i in ob) {
        return false;
    }
    return true;
}
//let workaround_events = ['mousemove','mousedown','mouseup','touchmove','touchstart','touchend','wheel'];
let workaround_events = [''];
class KlamptModel extends base_1.DOMWidgetModel {
    defaults() {
        return Object.assign(Object.assign({}, super.defaults()), { _model_name: KlamptModel.model_name, _model_module: KlamptModel.model_module, _model_module_version: KlamptModel.model_module_version, _view_name: KlamptModel.view_name, _view_module: KlamptModel.view_module, _view_module_version: KlamptModel.view_module_version, _camera: { 'camera is': 'first time in javascript' }, events: [] });
    }
}
exports.KlamptModel = KlamptModel;
KlamptModel.serializers = Object.assign({}, base_1.DOMWidgetModel.serializers);
KlamptModel.model_name = 'KlamptModel';
KlamptModel.model_module = version_1.MODULE_NAME;
KlamptModel.model_module_version = version_1.MODULE_VERSION;
KlamptModel.view_name = 'KlamptView'; // Set to null if no view
KlamptModel.view_module = version_1.MODULE_NAME; // Set to null if no view
KlamptModel.view_module_version = version_1.MODULE_VERSION;
class KlamptView extends base_1.DOMWidgetView {
    initialize(parameters) {
        super.initialize(parameters);
        this.el.classList.add('custom-widget');
        this.el.addEventListener('mouseover', this);
        this.el.addEventListener('mouseleave', this);
        this.el.addEventListener('focusin', this);
        this.el.addEventListener('focusout', this);
        this.el.addEventListener('contextmenu', this);
        this.waitDraw = false;
        this.pendingRpcs = [];
        this.handlingEvent = false;
        this.klamptArea = this.createDiv();
        this.el.appendChild(this.klamptArea);
        this.messageArea = document.createElement("div");
        this.el.appendChild(this.messageArea);
    }
    render() {
        console.log("Initialize Klampt frontend");
        this.klampt = new KlamptFrontend_1.KlamptFrontend(this.klamptArea);
        var _this = this;
        this.klampt.set_camera_callback(function () {
            var cam = _this.klampt.get_camera();
            _this.model.set('_camera', cam);
            _this.touch();
        });
        this.model.on('change:scene', this.scene_changed, this);
        this.model.on('change:transforms', this.transforms_changed, this);
        this.model.on('change:rpc', this.rpc_changed, this);
        //this.klampt.resize(this.model.get('width'),this.model.get('height'));
        //write initial camera to model
        var cam = this.klampt.get_camera();
        this.model.set('_camera', cam);
        var redraw = false;
        if (!isEmpty(this.model.get('scene'))) {
            console.log("KlamptView.render: scene not empty");
            //this.scene_changed();
            this.klampt.update_scene(this.model.get('scene'));
            redraw = true;
        }
        if (!isEmpty(this.model.get('transforms'))) {
            console.log("KlamptView.render: transforms not empty");
            //this.transforms_changed();
            this.klampt.update_scene(this.model.get('transforms'));
            redraw = true;
        }
        if (!isEmpty(this.model.get('rpc'))) {
            console.log("KlamptView.render: rpc not empty");
            //this.rpc_changed();
            this.do_rpc(this.model.get('rpc'));
            redraw = true;
        }
        if (redraw) {
            setTimeout(this.redraw.bind(this), 0);
        }
    }
    redraw() {
        this.klampt.render();
        this.model.set('drawn', 1);
        this.touch();
    }
    createDiv() {
        var width = this.model.get('width');
        var height = this.model.get('height');
        var div = document.createElement("div");
        div.style.width = width + "px";
        div.style.height = height + "px";
        return div;
    }
    handleEvent(event) {
        if (this.handlingEvent) {
            return;
        }
        if (event.type == 'keydown')
            this.keydown(event);
        else if (event.type == 'keyup')
            this.keyup(event);
        else if (event.type == 'focusin' || event.type == 'mouseover')
            this.startCapture(event);
        else if (event.type == 'focusout' || event.type == 'mouseleave')
            this.stopCapture(event);
        else if (event.type == 'contextmenu') {
            event.stopPropagation();
            event.preventDefault();
        }
        else if (workaround_events.indexOf(event.type) >= 0) {
            this.handlingEvent = true;
            if (event.type.startsWith('mouse')) {
                let newevent = new MouseEvent(event.type, event);
                this.klamptArea.dispatchEvent(newevent);
            }
            else if (event.type.startsWith('touch')) {
                let newevent = new TouchEvent(event.type, event);
                this.klamptArea.dispatchEvent(newevent);
            }
            else {
                let newevent = new WheelEvent(event.type, event);
                this.klamptArea.dispatchEvent(newevent);
            }
            event.stopPropagation();
            event.preventDefault();
            this.handlingEvent = false;
        }
    }
    startCapture(event) {
        let capture_event = true;
        let tab_index = "-4242";
        ///need to bypass Jupyterlab's event handling
        document.addEventListener('keydown', this, capture_event);
        document.addEventListener('keyup', this, capture_event);
        for (let ev in workaround_events) {
            document.addEventListener(workaround_events[ev], this, capture_event);
        }
        // Try to focus....
        this.el.focus({ preventScroll: true });
        if (this.el != document.activeElement) {
            // We didn't actually focus, so make sure the element can be focused...
            this.el.setAttribute("tabindex", tab_index);
            this.el.focus({ preventScroll: true });
        }
    }
    stopCapture(event) {
        let capture_event = true;
        let tab_index = "-4242";
        document.removeEventListener('keydown', this, capture_event);
        document.removeEventListener('keyup', this, capture_event);
        for (let ev in workaround_events) {
            document.removeEventListener(workaround_events[ev], this, capture_event);
        }
        // Remove the tabindex if we added it...
        if (this.el.getAttribute("tabindex") == tab_index) {
            this.el.removeAttribute("tabindex");
        }
        this.el.blur();
    }
    keydown(event) {
        console.log("Got a keydown event " + event.keyCode);
        var events = [...this.model.get('events')];
        events.push(event);
        this.model.set('event', events);
        this.touch();
        event.stopPropagation();
        event.preventDefault();
    }
    keyup(event) {
        console.log("Got a keyup event " + event.keyCode);
        event.stopPropagation();
        event.preventDefault();
    }
    scene_changed() {
        var msg = this.model.get('scene');
        console.log("Klamp't widget: setting scene");
        if (this.waitDraw) {
            this.klampt.update_scene(msg);
        }
        else {
            var _this = this;
            this.waitDraw = true;
            setTimeout(function () {
                _this.klampt.update_scene(msg);
                _this.klampt.render();
                _this.model.set('drawn', 1);
                _this.touch();
                _this.waitDraw = false;
            }, 0);
        }
    }
    transforms_changed() {
        var msg = this.model.get('transforms');
        //console.log("Klamp't widget: setting transforms");
        if (this.waitDraw) {
            this.klampt.update_scene(msg);
        }
        else {
            var _this = this;
            this.waitDraw = true;
            setTimeout(function () {
                _this.klampt.update_scene(msg);
                _this.klampt.render();
                _this.model.set('drawn', 1);
                _this.touch();
                _this.waitDraw = false;
            }, 0);
        }
    }
    do_rpc(msg) {
        if (msg.type == 'multiple') {
            for (var i = 0; i < msg.calls.length; i++) {
                this.do_rpc(msg.calls[i]);
            }
        }
        else if (msg.type == 'reset_scene') {
            //console.log("Klamp't widget: resetting scene");
            this.klampt.reset_scene();
        }
        else if (msg.type == 'reset_camera') {
            //console.log("Klamp't widget: calling reset_camera");
            this.klampt.reset_camera();
        }
        else {
            //console.log("Klamp't widget: calling rpc "+msg);
            this.klampt.rpc(msg);
        }
    }
    rpc_changed() {
        var msg = this.model.get('rpc');
        //console.log("rpc "+msg);
        if (this.waitDraw) {
            this.pendingRpcs.push(msg);
        }
        else {
            var _this = this;
            this.waitDraw = true;
            setTimeout(function () {
                _this.do_rpc(msg);
                for (var i = 0; i < _this.pendingRpcs.length; i++)
                    _this.do_rpc(_this.pendingRpcs[i]);
                _this.pendingRpcs = [];
                _this.klampt.render();
                _this.model.set('drawn', 1);
                _this.touch();
                _this.waitDraw = false;
            }, 0);
        }
    }
}
exports.KlamptView = KlamptView;
//# sourceMappingURL=widget.js.map

/***/ }),

/***/ "./node_modules/css-loader/dist/cjs.js!./css/widget.css":
/*!**************************************************************!*\
  !*** ./node_modules/css-loader/dist/cjs.js!./css/widget.css ***!
  \**************************************************************/
/***/ ((module, exports, __webpack_require__) => {

// Imports
var ___CSS_LOADER_API_IMPORT___ = __webpack_require__(/*! ../node_modules/css-loader/dist/runtime/api.js */ "./node_modules/css-loader/dist/runtime/api.js");
exports = ___CSS_LOADER_API_IMPORT___(false);
// Module
exports.push([module.id, ".custom-widget {\n  background-color: lightseagreen;\n  padding: 0px 2px;\n}\n", ""]);
// Exports
module.exports = exports;


/***/ }),

/***/ "./node_modules/css-loader/dist/runtime/api.js":
/*!*****************************************************!*\
  !*** ./node_modules/css-loader/dist/runtime/api.js ***!
  \*****************************************************/
/***/ ((module) => {

"use strict";


/*
  MIT License http://www.opensource.org/licenses/mit-license.php
  Author Tobias Koppers @sokra
*/
// css base code, injected by the css-loader
// eslint-disable-next-line func-names
module.exports = function (useSourceMap) {
  var list = []; // return the list of modules as css string

  list.toString = function toString() {
    return this.map(function (item) {
      var content = cssWithMappingToString(item, useSourceMap);

      if (item[2]) {
        return "@media ".concat(item[2], " {").concat(content, "}");
      }

      return content;
    }).join('');
  }; // import a list of modules into the list
  // eslint-disable-next-line func-names


  list.i = function (modules, mediaQuery, dedupe) {
    if (typeof modules === 'string') {
      // eslint-disable-next-line no-param-reassign
      modules = [[null, modules, '']];
    }

    var alreadyImportedModules = {};

    if (dedupe) {
      for (var i = 0; i < this.length; i++) {
        // eslint-disable-next-line prefer-destructuring
        var id = this[i][0];

        if (id != null) {
          alreadyImportedModules[id] = true;
        }
      }
    }

    for (var _i = 0; _i < modules.length; _i++) {
      var item = [].concat(modules[_i]);

      if (dedupe && alreadyImportedModules[item[0]]) {
        // eslint-disable-next-line no-continue
        continue;
      }

      if (mediaQuery) {
        if (!item[2]) {
          item[2] = mediaQuery;
        } else {
          item[2] = "".concat(mediaQuery, " and ").concat(item[2]);
        }
      }

      list.push(item);
    }
  };

  return list;
};

function cssWithMappingToString(item, useSourceMap) {
  var content = item[1] || ''; // eslint-disable-next-line prefer-destructuring

  var cssMapping = item[3];

  if (!cssMapping) {
    return content;
  }

  if (useSourceMap && typeof btoa === 'function') {
    var sourceMapping = toComment(cssMapping);
    var sourceURLs = cssMapping.sources.map(function (source) {
      return "/*# sourceURL=".concat(cssMapping.sourceRoot || '').concat(source, " */");
    });
    return [content].concat(sourceURLs).concat([sourceMapping]).join('\n');
  }

  return [content].join('\n');
} // Adapted from convert-source-map (MIT)


function toComment(sourceMap) {
  // eslint-disable-next-line no-undef
  var base64 = btoa(unescape(encodeURIComponent(JSON.stringify(sourceMap))));
  var data = "sourceMappingURL=data:application/json;charset=utf-8;base64,".concat(base64);
  return "/*# ".concat(data, " */");
}

/***/ }),

/***/ "./css/widget.css":
/*!************************!*\
  !*** ./css/widget.css ***!
  \************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var api = __webpack_require__(/*! !../node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js */ "./node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js");
            var content = __webpack_require__(/*! !!../node_modules/css-loader/dist/cjs.js!./widget.css */ "./node_modules/css-loader/dist/cjs.js!./css/widget.css");

            content = content.__esModule ? content.default : content;

            if (typeof content === 'string') {
              content = [[module.id, content, '']];
            }

var options = {};

options.insert = "head";
options.singleton = false;

var update = api(content, options);



module.exports = content.locals || {};

/***/ }),

/***/ "./node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js":
/*!****************************************************************************!*\
  !*** ./node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js ***!
  \****************************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var isOldIE = function isOldIE() {
  var memo;
  return function memorize() {
    if (typeof memo === 'undefined') {
      // Test for IE <= 9 as proposed by Browserhacks
      // @see http://browserhacks.com/#hack-e71d8692f65334173fee715c222cb805
      // Tests for existence of standard globals is to allow style-loader
      // to operate correctly into non-standard environments
      // @see https://github.com/webpack-contrib/style-loader/issues/177
      memo = Boolean(window && document && document.all && !window.atob);
    }

    return memo;
  };
}();

var getTarget = function getTarget() {
  var memo = {};
  return function memorize(target) {
    if (typeof memo[target] === 'undefined') {
      var styleTarget = document.querySelector(target); // Special case to return head of iframe instead of iframe itself

      if (window.HTMLIFrameElement && styleTarget instanceof window.HTMLIFrameElement) {
        try {
          // This will throw an exception if access to iframe is blocked
          // due to cross-origin restrictions
          styleTarget = styleTarget.contentDocument.head;
        } catch (e) {
          // istanbul ignore next
          styleTarget = null;
        }
      }

      memo[target] = styleTarget;
    }

    return memo[target];
  };
}();

var stylesInDom = [];

function getIndexByIdentifier(identifier) {
  var result = -1;

  for (var i = 0; i < stylesInDom.length; i++) {
    if (stylesInDom[i].identifier === identifier) {
      result = i;
      break;
    }
  }

  return result;
}

function modulesToDom(list, options) {
  var idCountMap = {};
  var identifiers = [];

  for (var i = 0; i < list.length; i++) {
    var item = list[i];
    var id = options.base ? item[0] + options.base : item[0];
    var count = idCountMap[id] || 0;
    var identifier = "".concat(id, " ").concat(count);
    idCountMap[id] = count + 1;
    var index = getIndexByIdentifier(identifier);
    var obj = {
      css: item[1],
      media: item[2],
      sourceMap: item[3]
    };

    if (index !== -1) {
      stylesInDom[index].references++;
      stylesInDom[index].updater(obj);
    } else {
      stylesInDom.push({
        identifier: identifier,
        updater: addStyle(obj, options),
        references: 1
      });
    }

    identifiers.push(identifier);
  }

  return identifiers;
}

function insertStyleElement(options) {
  var style = document.createElement('style');
  var attributes = options.attributes || {};

  if (typeof attributes.nonce === 'undefined') {
    var nonce =  true ? __webpack_require__.nc : 0;

    if (nonce) {
      attributes.nonce = nonce;
    }
  }

  Object.keys(attributes).forEach(function (key) {
    style.setAttribute(key, attributes[key]);
  });

  if (typeof options.insert === 'function') {
    options.insert(style);
  } else {
    var target = getTarget(options.insert || 'head');

    if (!target) {
      throw new Error("Couldn't find a style target. This probably means that the value for the 'insert' parameter is invalid.");
    }

    target.appendChild(style);
  }

  return style;
}

function removeStyleElement(style) {
  // istanbul ignore if
  if (style.parentNode === null) {
    return false;
  }

  style.parentNode.removeChild(style);
}
/* istanbul ignore next  */


var replaceText = function replaceText() {
  var textStore = [];
  return function replace(index, replacement) {
    textStore[index] = replacement;
    return textStore.filter(Boolean).join('\n');
  };
}();

function applyToSingletonTag(style, index, remove, obj) {
  var css = remove ? '' : obj.media ? "@media ".concat(obj.media, " {").concat(obj.css, "}") : obj.css; // For old IE

  /* istanbul ignore if  */

  if (style.styleSheet) {
    style.styleSheet.cssText = replaceText(index, css);
  } else {
    var cssNode = document.createTextNode(css);
    var childNodes = style.childNodes;

    if (childNodes[index]) {
      style.removeChild(childNodes[index]);
    }

    if (childNodes.length) {
      style.insertBefore(cssNode, childNodes[index]);
    } else {
      style.appendChild(cssNode);
    }
  }
}

function applyToTag(style, options, obj) {
  var css = obj.css;
  var media = obj.media;
  var sourceMap = obj.sourceMap;

  if (media) {
    style.setAttribute('media', media);
  } else {
    style.removeAttribute('media');
  }

  if (sourceMap && typeof btoa !== 'undefined') {
    css += "\n/*# sourceMappingURL=data:application/json;base64,".concat(btoa(unescape(encodeURIComponent(JSON.stringify(sourceMap)))), " */");
  } // For old IE

  /* istanbul ignore if  */


  if (style.styleSheet) {
    style.styleSheet.cssText = css;
  } else {
    while (style.firstChild) {
      style.removeChild(style.firstChild);
    }

    style.appendChild(document.createTextNode(css));
  }
}

var singleton = null;
var singletonCounter = 0;

function addStyle(obj, options) {
  var style;
  var update;
  var remove;

  if (options.singleton) {
    var styleIndex = singletonCounter++;
    style = singleton || (singleton = insertStyleElement(options));
    update = applyToSingletonTag.bind(null, style, styleIndex, false);
    remove = applyToSingletonTag.bind(null, style, styleIndex, true);
  } else {
    style = insertStyleElement(options);
    update = applyToTag.bind(null, style, options);

    remove = function remove() {
      removeStyleElement(style);
    };
  }

  update(obj);
  return function updateStyle(newObj) {
    if (newObj) {
      if (newObj.css === obj.css && newObj.media === obj.media && newObj.sourceMap === obj.sourceMap) {
        return;
      }

      update(obj = newObj);
    } else {
      remove();
    }
  };
}

module.exports = function (list, options) {
  options = options || {}; // Force single-tag solution on IE6-9, which has a hard limit on the # of <style>
  // tags it will allow on a page

  if (!options.singleton && typeof options.singleton !== 'boolean') {
    options.singleton = isOldIE();
  }

  list = list || [];
  var lastIdentifiers = modulesToDom(list, options);
  return function update(newList) {
    newList = newList || [];

    if (Object.prototype.toString.call(newList) !== '[object Array]') {
      return;
    }

    for (var i = 0; i < lastIdentifiers.length; i++) {
      var identifier = lastIdentifiers[i];
      var index = getIndexByIdentifier(identifier);
      stylesInDom[index].references--;
    }

    var newLastIdentifiers = modulesToDom(newList, options);

    for (var _i = 0; _i < lastIdentifiers.length; _i++) {
      var _identifier = lastIdentifiers[_i];

      var _index = getIndexByIdentifier(_identifier);

      if (stylesInDom[_index].references === 0) {
        stylesInDom[_index].updater();

        stylesInDom.splice(_index, 1);
      }
    }

    lastIdentifiers = newLastIdentifiers;
  };
};

/***/ }),

/***/ "./package.json":
/*!**********************!*\
  !*** ./package.json ***!
  \**********************/
/***/ ((module) => {

"use strict";
module.exports = JSON.parse('{"name":"klampt-jupyter-widget","version":"0.1.2","description":"A Jupyter Widget for Klampt","keywords":["jupyter","jupyterlab","jupyterlab-extension","widgets"],"files":["lib/**/*.js","dist/*.js","css/*.css"],"homepage":"https://github.com/krishauser/Klampt-jupyter-extension","bugs":{"url":"https://github.com/krishauser/Klampt-jupyter-extension/issues"},"license":"BSD-3-Clause","author":{"name":"Kris Hauser","email":"hauser.kris@gmail.com"},"main":"lib/index.js","types":"./lib/index.d.ts","repository":{"type":"git","url":"https://github.com/krishauser/Klampt-jupyter-extension"},"scripts":{"build":"yarn run build:lib && yarn run build:nbextension && yarn run build:labextension:dev","build:prod":"yarn run build:lib && yarn run build:nbextension && yarn run build:labextension","build:labextension":"jupyter labextension build .","build:labextension:dev":"jupyter labextension build --development True .","build:lib":"tsc","build:nbextension":"webpack","clean":"yarn run clean:lib && yarn run clean:nbextension && yarn run clean:labextension","clean:lib":"rimraf lib","clean:labextension":"rimraf klampt_jupyter/labextension","clean:nbextension":"rimraf klampt_jupyter/nbextension/static/index.js","lint":"eslint . --ext .ts,.tsx --fix","lint:check":"eslint . --ext .ts,.tsx","prepack":"yarn run build:lib","test":"jest --transformIgnorePatterns \\"node_modules/(?!@toolz/allow)/\\" --env=jsdom","watch":"npm-run-all -p watch:*","watch:lib":"tsc -w","watch:nbextension":"webpack --watch --mode=development","watch:labextension":"jupyter labextension watch ."},"dependencies":{"@jupyter-widgets/base":"^1.1.10 || ^2.0.0 || ^3.0.0 || ^4.0.0","@types/three":"^0.136.1","three-trackballcontrols-ts":"^0.2.3"},"devDependencies":{"@babel/core":"^7.5.0","@babel/preset-env":"^7.5.0","@jupyterlab/builder":"^3.0.0","@phosphor/application":"^1.6.0","@phosphor/widgets":"^1.6.0","@types/jest":"^26.0.0","@types/webpack-env":"^1.13.6","@typescript-eslint/eslint-plugin":"^3.6.0","@typescript-eslint/parser":"^3.6.0","acorn":"^7.2.0","css-loader":"^3.2.0","eslint":"^7.4.0","eslint-config-prettier":"^6.11.0","eslint-plugin-prettier":"^3.1.4","fs-extra":"^7.0.0","identity-obj-proxy":"^3.0.0","jest":"^26.0.0","mkdirp":"^0.5.1","npm-run-all":"^4.1.3","prettier":"^2.0.5","rimraf":"^2.6.2","source-map-loader":"^1.1.3","style-loader":"^1.0.0","ts-jest":"^26.0.0","ts-loader":"^8.0.0","typescript":"~4.1.3","webpack":"^5.0.0","webpack-cli":"^4.0.0"},"jupyterlab":{"extension":"lib/plugin","outputDir":"klampt_jupyter/labextension/","sharedPackages":{"@jupyter-widgets/base":{"bundled":false,"singleton":true}}}}');

/***/ })

}]);
//# sourceMappingURL=lib_widget_js.f3afe5bee65feee5451f.js.map