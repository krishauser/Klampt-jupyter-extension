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

import { Dict } from '@jupyter-widgets/base';

import * as THREE from 'three';
import { TrackballControls } from 'three-trackballcontrols-ts';

function is_undefined_or_null(x:any) {
  return (typeof x === 'undefined' || x === null);
}


function _power_of_2(n : number) {
  return (n != 0) && (n & (n - 1)) == 0;
}

function onRemove(element : HTMLElement, callback : Function) {
  const parent = element.parentNode;
  if (!parent) throw new Error("The node must already be attached");

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

export class KlamptFrontend {
  width : number;
  height: number;
  sceneCache : Dict<THREE.Object3D>;
  extras : THREE.Group;
  sceneArea : HTMLElement;
  scene : THREE.Scene;
  renderer : THREE.WebGLRenderer;
  loader : THREE.ObjectLoader;
  controls : TrackballControls;
  camera : THREE.PerspectiveCamera;
  cameraCallback : Function|null;
  animating : boolean;

  constructor(dom_sceneArea : HTMLElement) {
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
    dom_sceneArea.appendChild( this.renderer.domElement );  //attach the three.js renderer to the proper div 

    this.cameraCallback = null;
    this.animating = false;
    this.reset_camera();
    this.reset_scene();

    onRemove(dom_sceneArea, this.close.bind(this) )
    window.addEventListener('resize',this);
    var _this = this;
    let initBind = function() {
      if(_this.sceneArea.clientWidth != 0 || _this.sceneArea.offsetWidth != 0) {
        _this.resize(_this.sceneArea.clientWidth,_this.sceneArea.clientHeight);
        _this.controls.update();
        _this.render();
      }
      else {
        setTimeout(initBind,10);
      }
    }
    setTimeout(initBind,0);
  }

  handleEvent(event : Event) {
    if(event.type == 'resize') {
      if(this.sceneArea.clientWidth != 0) {
        this.resize(this.sceneArea.clientWidth,this.sceneArea.clientHeight);
      }
    }
  }

  close() {
    console.log("Closing KlamptFrontend");
    this.animating = false;
    window.removeEventListener('resize',this);
    this.controls.dispose();
    this.reset_scene();
  }

  set_shadow(enabled: boolean)
  {
    this.renderer.shadowMap.enabled = enabled;
  }

  resize( w : number, h : number)
  {
    console.log("KLAMPT.resize width: " + w + " height: " + h);

    this.width= w; //account for 5px padding on each side
    this.height=h;

    this.renderer.setSize(this.width,this.height);
    this.camera.aspect = this.width/ this.height;

    this.camera.updateProjectionMatrix();  
    this.controls.handleResize();
    this.render();
  }

  addObject(name : string, object : THREE.Object3D)
  {
    object.name = name;
    this.sceneCache[name] = object;
    this.extras.add(object);
  }

  getObject(name : string) 
  {
    let object = this.sceneCache[name];
    if(object == null) {
      let object2 = this.scene.getObjectByName(name );
      if(object2 != null) {
        this.sceneCache[name] = object2;
      }
      return object2;
    }
    return object;
  }

  removeObject(name : string)
  {
    let obj = this.getObject(name);
    if(obj) {
       if(name in this.sceneCache) {
          delete this.sceneCache[name];
       }
       let meshobj = obj as THREE.Mesh;
       if ( !is_undefined_or_null(meshobj.geometry) ) meshobj.geometry.dispose();
       if ( !is_undefined_or_null(meshobj.material) ) (meshobj.material as THREE.Material).dispose();
       obj.visible = false;
       if(obj.parent != null)
         obj.parent.remove(obj);
    }
    else {
      let obj2 = this.sceneArea.querySelector("#_text_overlay_"+name);
      if(obj2 != null) {
        if(obj2.parentNode != null)
          obj2.parentNode.removeChild(obj2);
      }
      else {
        console.log("KLAMPT.rpc: Item to be removed "+name+" not found");
      }
    }
  }

  //dataJ has a Three.js scene object format
  _set_scene(dataJ : any)
  {
     this.scene.traverse( function ( child ) { //make sure to dispose all old objects
         let meshchild = child as THREE.Mesh;
         if ( !is_undefined_or_null(meshchild.geometry) ) meshchild.geometry.dispose();
         if ( !is_undefined_or_null(meshchild.material) ) (meshchild.material as THREE.Material).dispose();
     } );
     this.sceneCache={};

     this.scene = this.loader.parse( dataJ );
     if (this.scene == null) {
       console.log("KLAMPT.update_scene: Invalid scene sent from server");
       this.scene = new THREE.Scene();
     }

     let newItems : Array<any>;
     newItems = [];
     this.scene.traverse( function (child) {
      if(!(child instanceof THREE.Light)) {
        let meshchild = child as THREE.Mesh;
        if ( !is_undefined_or_null(meshchild.geometry) ) {
          if(meshchild.geometry instanceof THREE.Geometry) {
            meshchild.geometry.computeFaceNormals();
            console.log("Geometry: normals of "+child.name+" calculated\n");
          }
          else if(child instanceof THREE.Points) {
            //no normals needed here
          }
          else if(meshchild.geometry instanceof THREE.BufferGeometry) {
            if(is_undefined_or_null(meshchild.geometry.attributes.normal)) {  //need to compute normals
              console.log("BufferGeometry: Computing normals of "+child.name+" from triangles\n");
              let positions = meshchild.geometry.attributes["position"];
              if(meshchild.geometry.index == null) return;
              let indices = meshchild.geometry.index.array;
              let normals = new Float32Array(positions.array.length);
              for(let i=0;i<positions.array.length;i++)
                normals[i] = 0.0;
              let vba = new THREE.Vector3();
              let vca = new THREE.Vector3();
              let vn = new THREE.Vector3();
              for(let tri=0;tri<indices.length;tri+=3) {
                let a=indices[tri];
                let b=indices[tri+1];
                let c=indices[tri+2];
                vba.x = positions.array[b*3]-positions.array[a*3];
                vba.y = positions.array[b*3+1]-positions.array[a*3+1];
                vba.z = positions.array[b*3+2]-positions.array[a*3+2];
                vca.x = positions.array[c*3]-positions.array[a*3];
                vca.y = positions.array[c*3+1]-positions.array[a*3+1];
                vca.z = positions.array[c*3+2]-positions.array[a*3+2];
                vn.crossVectors(vba,vca);
                vn.normalize();
                normals[a*3] += vn.x;
                normals[a*3+1] += vn.y;
                normals[a*3+2] += vn.z;
                normals[b*3] += vn.x;
                normals[b*3+1] += vn.y;
                normals[b*3+2] += vn.z;
                normals[c*3] += vn.x;
                normals[c*3+1] += vn.y;
                normals[c*3+2] += vn.z;
              }
              for(let i=0;i<positions.array.length;i+=3) {
                vn.x = normals[i];
                vn.y = normals[i+1];
                vn.z = normals[i+2];
                vn.normalize();
                normals[i] = vn.x;
                normals[i+1] = vn.y;
                normals[i+2] = vn.z;
              }
              meshchild.geometry.setAttribute( 'normal', new THREE.BufferAttribute( normals, 3 ) );
            }
            else {
              console.log("BufferGeometry Item "+child.name+" already has normals\n");
            }
          }
          else {
            console.log("Item "+child.name+" is neither a geometry or THREE.BufferGeometry\n");
          }
        }
        if(child.name == "Terrain") {
          child.receiveShadow = true;
          child.castShadow = true;
        }
        else {
          child.receiveShadow = true;
          child.castShadow = true;
        }

      }
      else if(child instanceof THREE.DirectionalLight || child instanceof THREE.SpotLight) {
        child.intensity *= 0.8;
        child.castShadow = true;
        //child.shadow.darkness = 0.3;
        if(child instanceof THREE.DirectionalLight) {
          //child.position.set( 0, 0, 10 ); 
          //child.shadow.camera.fov = 50;
          child.shadow.bias = -0.00001;
          child.shadow.mapSize.x = 1024;
          child.shadow.mapSize.y = 1024;
          child.shadow.camera.right     =  5;
          child.shadow.camera.left     = -5;
          child.shadow.camera.top      =  5;
          child.shadow.camera.bottom   = -5;
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
     this.scene.add(new THREE.AmbientLight(0xffffff,0.2));
     for(let i=0;i<newItems.length;i++)
        this.scene.add(newItems[i]);


    let AxesHelper = new THREE.AxesHelper( 0.2 );
    let linemat = AxesHelper.material as THREE.LineBasicMaterial;
    linemat.linewidth = 2.0;
    this.scene.add( AxesHelper );
    this.extras = new THREE.Group();
    this.scene.add(this.extras);
  }

  ///sceneObjects is a list of dictionaries, each containing the members "name" and "matrix"
  _set_transforms(sceneObjects : Array<Dict<any> >)
  {
     for(let i=0; i<sceneObjects.length; i++)
     {  
        //console.log("Update requested to: " + sceneObjects[i].name);
        //console.log("  new matrix is: " + sceneObjects[i].matrix);

        let object = this.getObject(sceneObjects[i].name);
        if(object != null)
        { 
          //console.log("  we found \"" + sceneObjects[i].name + "\" in the Three.js scene");
                         
          object.matrixAutoUpdate=false;
          object.matrixWorldNeedsUpdate=true;
        
          let m=sceneObjects[i].matrix;
     
          object.matrix.set(m[0],m[4],m[8],m[12],m[1],m[5],m[9],m[13],m[2],m[6],m[10],m[14],m[3],m[7],m[11],m[15]);
        } 
        else {
          console.log("KLAMPT.update_scene: Did not find \"" + sceneObjects[i].name + "\" in the Three.js scene");
        }
     } 
  }

  _setupBillboard(name : string, texture : any, size : number) {
    let material;
    if (!_power_of_2(texture.image.width) || !_power_of_2(texture.image.height)) {
      console.log("Warning, texture does not have a power of two width / height: "+texture.image.width+","+texture.image.height);
      return;
    }
    else {
      if(texture.format == THREE.AlphaFormat || texture.format == THREE.LuminanceFormat ) {
        material = new THREE.MeshBasicMaterial( {
          alphaMap : texture,
          transparent: true,
          opacity: 1
        } );
      }
      else {
        material = new THREE.MeshBasicMaterial( {
          map: texture
        } );
      }
    }

    let obj = this.getObject(name);
    let meshobj = obj as THREE.Mesh;
    meshobj.material = material;
    meshobj.material.needsUpdate = true;
  }

  
  rpc(request :any)
  {
     if(request.type == 'set_camera') {
      let data=request;
      if(data.up !== undefined) {
        this.camera.up.x = data.up.x;
        this.camera.up.y = data.up.y;
        this.camera.up.z = data.up.z;
      }
      if(data.target !== undefined) {
        this.controls.target.x = data.target.x;
        this.controls.target.y = data.target.y;
        this.controls.target.z = data.target.z;
      }
      if(data.position !== undefined) {
        this.camera.position.x = data.position.x;
        this.camera.position.y = data.position.y;
        this.camera.position.z = data.position.z;
      }
      if(data.near !== undefined) {
        this.camera.near = data.near;
      }
      if(data.far !== undefined) {
        this.camera.far = data.far;
      }
      this.controls.update();
     }
     else if(request.type == "clear_extras")  {
       //clear scene
       var _this = this;
       this.extras.traverse(function(child) {
          if(!is_undefined_or_null(child.name) && child.name in _this.sceneCache) 
            delete _this.sceneCache[child.name];
          let meshchild = child as THREE.Mesh;
          if ( !is_undefined_or_null(meshchild.geometry) ) meshchild.geometry.dispose();
          if ( !is_undefined_or_null(meshchild.material) ) (meshchild.material as THREE.Material).dispose();
       } );
       this.scene.remove(this.extras);
       this.extras = new THREE.Group();
       this.scene.add(this.extras);
       //clear text
       let overlayList = [];
       for(let i=0;i<this.sceneArea.children.length; i++) {
        if(this.sceneArea.children[i].id.startsWith("_text_overlay_")) {
          overlayList.push(this.sceneArea.children[i]);
          //console.log("Removing text item "+sceneArea.children[i].id);
        }
      }
      for (let i=0;i<overlayList.length;i++) {
        //console.log("Clearing text "+overlayList[i].id);
        this.sceneArea.removeChild(overlayList[i]);
      }
     }
     else if(request.type == "remove") {
       //remove object from scene
       //console.log("Removing item "+request.object);
       this.removeObject(request.object);
     }
     else if(request.type == "set_color") 
     {
        let object_name=request.object;
        let rgba=request.rgba;
        let recursive=request.recursive;
                                                   
        //console.log("set_color requested. object: " + object_name + " rgba: " + rgba); 
        
        let obj = this.getObject(object_name);
        if(obj == null) {
          console.log("KLAMPT.rpc: Invalid object name "+object_name+" specified in set_color");
        }
        else { 
          let shared = (is_undefined_or_null(obj.userData.customSharedMaterialSetup));
           //if(!is_undefined_or_null(typeof object.material))
           //{
            //  console.log("first checking if we've working this this material before");
              let mobj = obj as THREE.Mesh;                       
              if (recursive == true)
              {
                if(is_undefined_or_null(mobj.material)) {
                  mobj.material=new THREE.MeshPhongMaterial();
                  mobj.userData.customSharedMaterialSetup=true;
                }
                else if(shared)
                {
                  mobj.material = (mobj.material as THREE.Material).clone();
                  mobj.userData.customSharedMaterialSetup=true;
                }
                mobj.traverse( function ( child ) { 
                  let mchild = child as THREE.Mesh;
                  if (!is_undefined_or_null(mchild.material)) {
                    let cshared = (is_undefined_or_null(child.userData.customSharedMaterialSetup));
                    if(!cshared) { (mchild.material as THREE.Material).dispose(); }
                    mchild.material=mobj.material;
                  }
                } );
              }
              else
              {
                if(mobj.material == null) {
                  mobj.material=new THREE.MeshPhongMaterial();
                  mobj.userData.customSingleMaterialSetup=true;
                }
                else if(shared)
                { 
                  mobj.material=(mobj.material as THREE.Material).clone();
                  mobj.userData.customSingleMaterialSetup=false;
                }
              }
              
              let mat = mobj.material as THREE.MeshBasicMaterial;
              mat.color.setRGB(rgba[0],rgba[1],rgba[2]);
              if(rgba[3]!=1.0)
              {
                mat.transparent=true;
                mat.opacity=rgba[3];
              }
              else
              {
                if(mat.alphaMap != null) 
                  mat.transparent=true;
                else
                  mat.transparent=false;
              }
           //}
           //else
           //{
           //   console.log("ERROR: no material associated with object: " + object_name);  
           //   alert("ERROR: kviz.set_color is trying to set an object with no material");
           //}
        }
     }
     else if(request.type == "set_visible") 
     {
        let object_name=request.object;
        let visible=request.value;
                                                   
        //console.log("set_visible requested. object: " + object_name + " visible: " + visible); 
        
        let object = this.getObject(object_name);
        if(object == null) {
          console.log("KLAMPT.rpc: Invalid object name "+object_name+" specified in set_visible");
        }
        else {
          object.visible = visible;
        }
     }
     else if(request.type == "add_ghost") 
     {
        let object_name=request.object;
        let prefix=request.prefix_name;
                                                   
        //console.log("add_ghost requested. object: " + object_name + " prefix: " + prefix); 
        let old_ghost = this.getObject(prefix+object_name);
        if(old_ghost == null) { 
          let object = this.getObject(object_name);
          if(object != null)
          { 
             let clone_object=object.clone(true);
             clone_object.traverse( function ( child ) { 
                      if (!is_undefined_or_null(child.name)) {
                         child.name=prefix+child.name;
                      }
                      //ghosts should not cast shadows
                      if (!is_undefined_or_null(child.castShadow)) {
                         child.castShadow = false;
                         child.receiveShadow = false;
                      }
             });
             this.addObject(prefix+object_name,clone_object);
             console.log("KLAMPT.rpc: Added ghost with name "+prefix+object_name);
          }
          else {
             console.log("KLAMPT.rpc: The ghost of object " + object_name + " could not be made since the object was not found");
          }
        }
        else {
          //there's already a ghost with that name... should we re-clone?
        }
     }
     else if(request.type == "set_transform")
     {                 
        //console.log("KLAMPT.rpc: got a set_transform RPC request for: " + request.object);
        let object = this.getObject(request.object);
        if(object != null)
        {
          if(object.matrix) {
            object.matrixAutoUpdate=false;
            object.matrixWorldNeedsUpdate=true;
          
            let m=request.matrix;
            object.matrix.set(m[0],m[1],m[2],m[3],m[4],m[5],m[6],m[7],m[8],m[9],m[10],m[11],m[12],m[13],m[14],m[15]);
          } 
          else 
            console.log("KLAMPT.rpc: object does not have matrix property: " + request.object);
        }
        else
           console.log("KLAMPT.rpc: couldn't find object: " + request.object);
     }
     else if(request.type == "add_text")
     {
        //console.log("RPC to add text!");   
        let text2 = this.sceneArea.querySelector("#_text_overlay_"+request.name) as HTMLElement;
        if(text2 == null) {
          let text3 = document.createElement('div');
          text3.style.position = 'absolute';
          text3.id="_text_overlay_"+request.name;
          text3.style.zIndex = "1";    // if you still don't see the label, try uncommenting this
          //text2.style.width = 100;
          //text2.style.height = 100;
          //text2.style.backgroundColor = "blue";
          if(request.text!=null)
             text3.innerHTML = request.text;
             
          text3.style.top = request.y + '%';
          text3.style.left = request.x + '%';
          this.sceneArea.appendChild(text3);
        }
        else {
          if(!is_undefined_or_null(request.text))
            text2.innerHTML = request.text;
          if(!is_undefined_or_null(request.x))
            text2.style.left = request.x + '%';
          if(!is_undefined_or_null(request.y))
            text2.style.top = request.y + '%';
        }
     }
     else if(request.type == "add_sphere")
     {
        let sphere = this.getObject(request.name);
        if(sphere == null) {
          //console.log("RPC to add sphere!"); 
          let slices = 20;
          if(request.r < 0.05) slices = 6;
          else if(request.r < 0.2) slices = 12;

          let geometry = new THREE.SphereGeometry(1.0,slices,slices);
          let material = new THREE.MeshPhongMaterial( {color: 0xAA0000} );
          let sphere2 = new THREE.Mesh( geometry, material );
          sphere2.userData.customSharedMaterialSetup=true;
          sphere2.castShadow = true;
          
          sphere2.scale.x=request.r;
          sphere2.scale.y=request.r;
          sphere2.scale.z=request.r;
          
          sphere2.position.set(request.x,request.y,request.z);
          this.addObject(request.name,sphere2);
        }
        else { 
           if(!is_undefined_or_null(request.x)) {
             sphere.position.set(request.x,request.y,request.z);
           }
           if(!is_undefined_or_null(request.r) && request.r > 0)
           {
              sphere.scale.x=request.r;
              sphere.scale.y=request.r;
              sphere.scale.z=request.r;
           }
        }
     }
     else if(request.type == "add_line")
     {
        let obj = this.getObject(request.name);
        if(obj == null) {
          let geometry = new THREE.Geometry();
          
          for(let i=0;i<request.verts.length;i+=3) {
            geometry.vertices.push(new THREE.Vector3(request.verts[i],request.verts[i+1],request.verts[i+2]));
          }
          //geometry.dynamic  = true;
             
          let material = new THREE.LineBasicMaterial( {color: 0xAA0000} );
          if(!is_undefined_or_null(request.width)) {
            material.linewidth = request.width;
          }
          let line = new THREE.Line( geometry, material );
          line.userData.customSharedMaterialSetup=true;
          this.addObject(request.name,line);
        }
        else {
          let line = obj as THREE.Line;
          let lgeom = line.geometry as THREE.Geometry;
          lgeom.vertices = []
          for(let i=0;i<request.verts.length;i+=3) {
             lgeom.vertices.push(new THREE.Vector3(request.verts[i],request.verts[i+1],request.verts[i+2]));
           }
           lgeom.verticesNeedUpdate = true;
        }
     }
     else if(request.type == "add_xform")
     {
        let xform = this.getObject(request.name);
        if(xform != null)
        this.removeObject(request.name);
        let axis = new THREE.AxesHelper(request.length);
        if(!is_undefined_or_null(request.width)) (axis.material as THREE.LineBasicMaterial).linewidth = request.width;
        this.addObject(request.name,axis);
     } 
     else if(request.type == 'add_trilist')
     {
       let obj = this.getObject(request.name);
       if(obj == null) {
         let geom = new THREE.Geometry();
         //geom.dynamic = true;
         for(let i=0;i<request.verts.length;i+=3) {
            geom.vertices.push(new THREE.Vector3(request.verts[i],request.verts[i+1],request.verts[i+2]));
         }
         for(let i=0;i<request.verts.length;i+=9) {
            geom.faces.push( new THREE.Face3( i/3, i/3+1, i/3+2 ) );
         }
         geom.computeFaceNormals();
         let mesh= new THREE.Mesh( geom, new THREE.MeshPhongMaterial() );
         mesh.castShadow = true;
         mesh.userData.customSharedMaterialSetup=true;
         this.addObject(request.name,mesh);
        }
        else {
          let mobj = obj as THREE.Mesh;
          if(request.verts.length != (mobj.geometry as THREE.Geometry).vertices.length*3 || true) {
            //might as well just completely recreate the geometry
            mobj.geometry.dispose();
            let geom = new THREE.Geometry();
            //geom.dynamic = true;
             for(let i=0;i<request.verts.length;i+=3) {
                geom.vertices.push(new THREE.Vector3(request.verts[i],request.verts[i+1],request.verts[i+2]));
             }
             for(let i=0;i<request.verts.length;i+=9) {
                geom.faces.push( new THREE.Face3( i/3, i/3+1, i/3+2 ) );
             }
            geom.computeFaceNormals();
            mobj.geometry = geom;
          }
          else {
            //for some reason this isn't working
            //console.log("Updating trilist vertices");
            /*
            obj.geometry.dynamic = true;
            obj.geometry.verticesNeedUpdate = true;
           for(let i=0;i<request.verts.length;i+=3) {
              obj.geometry.vertices[i/3] = new THREE.Vector3(request.verts[i],request.verts[i+1],request.verts[i+2]);
           }
            obj.geometry.computeFaceNormals();
            */
         }
       }
     }
     else if(request.type == 'add_trimesh')
     {
       let obj = this.getObject(request.name);
       if(obj == null) {
         let geom = new THREE.Geometry();
         //geom.dynamic = true;
         for(let i=0;i<request.verts.length;i+=3) {
            geom.vertices.push(new THREE.Vector3(request.verts[i],request.verts[i+1],request.verts[i+2]));
         }
         for(let i=0;i<request.tris.length;i+=3) {
            geom.faces.push( new THREE.Face3( request.tris[i], request.tris[i+1], request.tris[i+2] ) );
         }
         geom.computeFaceNormals();
         let mesh= new THREE.Mesh( geom, new THREE.MeshPhongMaterial() );
         mesh.castShadow = true;
         mesh.userData.customSharedMaterialSetup=true;
         this.addObject(request.name,mesh);
        }
        else {
          let mobj = obj as THREE.Mesh;
          if(request.verts.length != (mobj.geometry as THREE.Geometry).vertices.length*3 || true) {
            //might as well just completely recreate the geometry
            mobj.geometry.dispose();
            let geom = new THREE.Geometry();
            //geom.dynamic = true;
            for(let i=0;i<request.verts.length;i+=3) {
              geom.vertices.push(new THREE.Vector3(request.verts[i],request.verts[i+1],request.verts[i+2]));
            }
            for(let i=0;i<request.tris.length;i+=3) {
              geom.faces.push( new THREE.Face3( request.tris[i], request.tris[i+1], request.tris[i+2] ) );
            }
            geom.computeFaceNormals();
            mobj.geometry = geom;
          }
          else {
            //for some reason this isn't working
            //console.log("Updating trimesh vertices");
            /*
            obj.geometry.dynamic = true;
            obj.geometry.verticesNeedUpdate = true;
            for(let i=0;i<request.verts.length;i+=3) {
               obj.geometry.vertices[i/3] = new THREE.Vector3(request.verts[i],request.verts[i+1],request.verts[i+2]);
            }
            obj.geometry.computeFaceNormals();
            */
         }
       }
     }
     else if(request.type == 'add_points')
     {
       let obj = this.getObject(request.name);
       if(obj == null) {
         let geom = new THREE.Geometry();
         //geom.dynamic = true;
         for(let i=0;i<request.verts.length;i+=3) {
            geom.vertices.push(new THREE.Vector3(request.verts[i],request.verts[i+1],request.verts[i+2]));
         }
         let mat=new THREE.PointsMaterial();
         if(request.size)
           mat.size = request.size;
         else
           mat.size = 1;
         if(request.colors) {
            mat.vertexColors = true;
            for(let i=0;i<request.colors.length;i++) {
              geom.colors.push(new THREE.Color(request.colors[i]));
            }
         }
         else {
            mat.color = new THREE.Color(0xffffff);
         }
         let pts= new THREE.Points( geom, mat );
         pts.castShadow = false;
         pts.userData.customSharedMaterialSetup=true;
         this.addObject(request.name,pts);
        }
        else {
          let mobj = obj as THREE.Points;
          if(request.verts.length != (mobj.geometry as THREE.Geometry).vertices.length*3 || true) {
            //might as well just completely recreate the geometry
            mobj.geometry.dispose();
            let geom = new THREE.Geometry();
            //geom.dynamic = true;
            for(let i=0;i<request.verts.length;i+=3) {
              geom.vertices.push(new THREE.Vector3(request.verts[i],request.verts[i+1],request.verts[i+2]));
            }
            if(request.colors) {
              (mobj.material as THREE.PointsMaterial).vertexColors = true;
              for(let i=0;i<request.colors.length;i++) {
                geom.colors.push(new THREE.Color(request.colors[i]));
              }
            }
            else {
              (mobj.material as THREE.PointsMaterial).vertexColors = false;
            }
            mobj.geometry = geom;
          }
          else {
            //for some reason this isn't working
            //console.log("Updating point cloud vertices");
            /*
            obj.geometry.dynamic = true;
            obj.geometry.verticesNeedUpdate = true;
            for(let i=0;i<request.verts.length;i+=3) {
               obj.geometry.vertices[i/3] = new THREE.Vector3(request.verts[i],request.verts[i+1],request.verts[i+2]);
            }
            if(request.colors) {
              obj.material.vertexColors = true;
              for(let i=0;i<request.colors.length;i++) {
                obj.geometry.colors[i] = new THREE.Color(request.colors[i]);
              }
              obj.geometry.colorsNeedUpdate = true;
            }
            */
         }
       }
     }
     else if(request.type == 'add_billboard') {
       let size = request.size;
      let geom = new THREE.Geometry();
      geom.vertices.push(new THREE.Vector3(-size[0]*0.5,-size[1]*0.5,0));
      geom.vertices.push(new THREE.Vector3(size[0]*0.5,-size[1]*0.5,0));
      geom.vertices.push(new THREE.Vector3(size[0]*0.5,size[1]*0.5,0));
      geom.vertices.push(new THREE.Vector3(-size[0]*0.5,size[1]*0.5,0));
      geom.faces.push(new THREE.Face3(0,1,2));
      geom.faces.push(new THREE.Face3(0,2,3));
      geom.faceVertexUvs[0] = [];
      geom.faceVertexUvs[0][0] = [new THREE.Vector2(0,1),new THREE.Vector2(1,1),new THREE.Vector2(1,0)];
      geom.faceVertexUvs[0][1] = [new THREE.Vector2(0,1),new THREE.Vector2(1,0),new THREE.Vector2(0,0)];
      geom.computeFaceNormals();
      geom.uvsNeedUpdate = true;
      let mesh = new THREE.Mesh( geom, new THREE.MeshBasicMaterial() );
      mesh.userData.customSharedMaterialSetup=true;
      this.addObject(request.name,mesh);

       let filter = request.filter;
       let colormap = request.colormap;
       if(filter == 'nearest') filter = THREE.NearestFilter;
       else filter = THREE.LinearFilter;
       if (request.imagedata) {
         //load from data
         let w=request.width;
         let h=request.height;
         let data = atob(request.imagedata);
         let format = THREE.LuminanceFormat;
         if(colormap == 'opacity')
           format = THREE.LuminanceFormat; //AlphaFormat;
         if(data.length == 3*w*h)
           format = THREE.RGBFormat;
         else if(data.length == 4*w*h)
           format = THREE.RGBAFormat;
         else  {
           if(data.length != w*h)  {
            console.log("KLAMPT.rpc: Invalid image data length? "+data.length);
            return;
          }
         }
         let buffer = new Uint8Array(new ArrayBuffer(data.length));
         for(let i = 0; i < data.length; i++) {
            buffer[i] = data.charCodeAt(i);
         }
         let tex = new THREE.DataTexture(buffer,w,h,format,THREE.UnsignedByteType);
         tex.needsUpdate = true;
         //tex.minFilter = filter;
         //tex.magFilter = filter;
         this._setupBillboard(request.name,tex,size);
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
            function ( texture ) {
              texture.minFilter = filter;
              texture.magFilter = filter;
              _this._setupBillboard(request.name,texture,size);
            },
            // Function called when download progresses
            function ( xhr ) {
              console.log( (xhr.loaded / xhr.total * 100) + '% loaded' );
            },
            // Function called when download errors
            function ( xhr ) {
              console.log( 'An error happened' );
            }
          );
       }
       //create the billboard geometry
     }
     else {
        console.log("KLAMPT.rpc: Invalid request: "+request.type);
     }
  }

  reset_scene()
  {
     this.scene.traverse( function ( child : any ) { //make sure to dispose all old objects
          if (!is_undefined_or_null(child.geometry) ) child.geometry.dispose();
         if (!is_undefined_or_null(child.material) ) child.material.dispose();
     } );
     for (let i = this.scene.children.length - 1; i >= 0; i--) {
        this.scene.remove(this.scene.children[i]);
     }
     this.sceneCache={};

     //clear anything named _text_overlay_X
     let overlayList = [];
     for(let i=0;i<this.sceneArea.children.length; i++) {
      if(this.sceneArea.children[i].id.startsWith("_text_overlay_")) {
        overlayList.push(this.sceneArea.children[i]);
        //console.log("Removing text item "+sceneArea.children[i].id);
      }
    }
    for (let i=0;i<overlayList.length;i++) {
        this.sceneArea.removeChild(overlayList[i]);
    }

    this.scene.add(new THREE.AmbientLight(0xffffff,0.2));
    this.scene.add(new THREE.DirectionalLight(0xffffff,0.9));

    let AxesHelper = new THREE.AxesHelper( 0.2 );
    this.scene.add( AxesHelper );
    this.extras = new THREE.Group();
    this.scene.add(this.extras);
  }

  update_scene(data : any)
  {   
    //console.log("new scene has arrived!");

    //let dataJ=JSON.parse(data); 
    let dataJ = data;
    if(dataJ == null) {
      console.log("KLAMPT.update_scene: Unable to parse scene JSON!");
      //console.log(data);
      return;
    }

    //need to determine if full scene or just transforms
    let isFullScene=dataJ.metadata.fullscene;

    //console.log("full scene is: " + isFullScene);

    if(isFullScene)
    {
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

    
    let rpc =dataJ.RPC;
    if(rpc) {
      //let t1 = performance.now();
      for(let i=0; i<rpc.length; i++)
      {  
        try {
          this.rpc(rpc[i]);
        }
        catch(err) {
          console.log(rpc[i]);
          throw err;
        }
      }
      //let t2 = performance.now();
      if(rpc.length > 0)
      {
         //console.log("Call to do RPC's " + (t2 - t1) + " milliseconds.")
      }
    }
  }

  render()
  { 
    this.renderer.render( this.scene, this.camera );
  }

  reset_camera()
  {
    this.camera = new THREE.PerspectiveCamera( 45, this.width/this.height, 0.1, 1000 );
    this.camera.position.z = 6;
    this.camera.position.y = 3;
    if(this.controls != null)
      this.controls.dispose();
    this.controls=new TrackballControls( this.camera, this.sceneArea);
    this.controls.enabled = true;
    this.controls.rotateSpeed = 1.0;
    this.controls.zoomSpeed = 1.2;
    this.controls.panSpeed = 0.8;
    this.controls.noZoom = false;
    this.controls.noPan = false;
    this.controls.staticMoving = true;
    this.controls.dynamicDampingFactor = 0.3;
    this.controls.keys = [ 65, 83, 68 ];
    this.controls.addEventListener( 'change', this._on_camera_change.bind(this) );
    this.controls.addEventListener( 'start', this._on_camera_move_start.bind(this) );
    this.controls.addEventListener( 'end', this._on_camera_move_stop.bind(this) );
  }

  _on_camera_move_start() {
    if(!this.animating) {
      this.animating = true;
      this.animationLoop();
    }
  }

  _on_camera_move_stop() {
    this.animating = false;
  }

  animationLoop() {
    this.controls.update();
    if(this.animating)
      setTimeout(this.animationLoop.bind(this),20);
  }

  _on_camera_change() {
    this.render();
    if(this.cameraCallback != null) {
      //console.log("camera change, with callback");
      this.cameraCallback();
    }
    else {
      //console.log("camera change, W/O callback");
    }
  }

  set_camera_callback(cb : Function)
  {
    this.cameraCallback = cb;
  }

  get_camera()
  {
    return {up:this.camera.up,target:this.controls.target,position:this.camera.position,near:this.camera.near,far:this.camera.far};
  }

  set_camera(data : any)
  {
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
};
