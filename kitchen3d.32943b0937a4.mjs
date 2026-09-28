import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {assets} from './runtime-assets.8068bdb05f67.mjs';
import {foldedPoint} from './fold.e05692633005.mjs';
const v=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),rad=d=>d*Math.PI/180,safe=n=>T.PropertyBinding.sanitizeNodeName(n),clamp=T.MathUtils.clamp;
export class Kitchen3D {
  constructor(canvas){
    this.renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true,preserveDrawingBuffer:true});this.renderer.setClearColor(0,0);this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.75));this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.05;this.renderer.localClippingEnabled=true;this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;
    this.scene=new T.Scene();this.camera=new T.OrthographicCamera(-3,3,2,-2,.1,70);this.camera.position.z=30;
    this.scene.add(new T.HemisphereLight(0xffefd7,0x6f765e,1.7));const light=new T.DirectionalLight(0xfff2d9,2.4);light.position.set(-3,5,10);light.castShadow=true;Object.assign(light.shadow.camera,{left:-7,right:7,top:5,bottom:-7,near:1,far:30});light.shadow.mapSize.set(1024,1024);light.shadow.bias=-.001;light.shadow.normalBias=.006;this.scene.add(light);
    this.pan=new T.Group();this.scene.add(this.pan);const depth=new T.Mesh(new T.CircleGeometry(.988,96),new T.MeshBasicMaterial({colorWrite:false}));depth.renderOrder=-2;this.pan.add(depth);
    const shadow=new T.Mesh(new T.CircleGeometry(.99,96),new T.ShadowMaterial({opacity:.22}));shadow.position.z=.003;shadow.receiveShadow=true;this.pan.add(shadow);
    const table=new T.Mesh(new T.PlaneGeometry(25,25),new T.ShadowMaterial({opacity:.17}));table.position.z=-.35;table.receiveShadow=true;this.scene.add(table);
    this.topCamera=this.camera;this.servingView=null;this.hands={};this.ready=false;this.dt=.016;this.brushMatrix=new T.Matrix4().makeTranslation(0,4,-.78).multiply(new T.Matrix4().makeRotationZ(-Math.PI/2)).multiply(new T.Matrix4().makeScale(.45/.34,1/.34,1.3/.34)).multiply(new T.Matrix4().makeTranslation(0,-.87,-.255));this.brushTip=v(0,-.555,.19).applyMatrix4(this.brushMatrix);this.fold=null;
  }
  async load(){
    const loader=new GLTFLoader();const [hand,brush,crisp,handles,poses]=await Promise.all([loader.loadAsync(assets.hand),loader.loadAsync(assets.brush),loader.loadAsync(assets.crisp),loader.loadAsync(assets.handles),fetch(assets.poses).then(r=>{if(!r.ok)throw Error('hand poses');return r.json();})]);this.poses=poses;
    for(const side of ['right','left']){const root=new T.Group(),model=clone(hand.scene);root.add(model);this.scene.add(root);const bones={},meshes=[];model.traverse(o=>{if(o.isBone)bones[o.name]=o;if(o.isMesh){o.castShadow=true;o.frustumCulled=false;if(o.morphTargetInfluences)meshes.push(o);}});this.hands[side]={root,model,bones,meshes,sign:side==='left'?-1:1};}
    const restModel=clone(hand.scene),restRoot=new T.Group(),restBones={},restMeshes=[];restRoot.add(restModel);this.scene.add(restRoot);restModel.traverse(o=>{if(o.isBone)restBones[o.name]=o;if(o.isMesh&&o.morphTargetInfluences)restMeshes.push(o);});this.restHand={root:restRoot,model:restModel,bones:restBones,meshes:restMeshes,sign:1};restRoot.visible=false;
    this.brush=brush.scene;this.crisp=crisp.scene;this.scene.add(this.brush,this.crisp);this.handles=handles.scene;this.handles.scale.setScalar(1/2.4);this.pan.add(this.handles);
    for(const root of [this.brush,this.crisp,this.handles])root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.material.side=T.DoubleSide;o.material.metalness=Math.min(o.material.metalness||0,.45);}});
    // Loose toppings are drawn before hands and cannot write over forearms in depth.
    this.crisp.traverse(o=>{if(o.isMesh){o.renderOrder=-1;o.material.depthWrite=false;}});
    this.crispStack=Array.from({length:3},()=>{const o=this.crisp.clone(true);o.traverse(m=>{if(m.isMesh){m.material=m.material.clone();m.material.depthWrite=false;m.renderOrder=-1;}});this.scene.add(o);return o;});
    this.brushes={sweet:this.brush,chili:this.brush.clone(true)};this.brushes.chili.traverse(o=>{if(o.isMesh)o.material=o.material.clone();});this.scene.add(this.brushes.chili);
    this.kettle=(await loader.loadAsync(assets.kettle)).scene;this.scene.add(this.kettle);this.ready=true;
  }
  resize(w,h,px,py,r){this.w=w;this.h=h;this.px=px;this.py=py;this.r=r;this.renderer.setSize(w,h,false);Object.assign(this.topCamera,{left:-px/r,right:(w-px)/r,top:py/r,bottom:-(h-py)/r});this.topCamera.updateProjectionMatrix();if(this.servingView){this.servingView.camera.aspect=w/h;this.servingView.camera.updateProjectionMatrix();}}
  point(p,z=.1){return v((p.x-this.px)/this.r,(this.py-p.y)/this.r,z);}
  begin(dt,tx=0,ty=0){this.dt=dt;if(!this.ready)return;for(const h of Object.values(this.hands))h.root.visible=false;for(const b of Object.values(this.brushes||{sweet:this.brush}))b.visible=false;this.crisp.visible=false;this.pan.position.set(tx*5/this.r,-ty*4/this.r,0);this.pan.rotation.z=-tx*.024;this.pan.scale.y=1-ty*.035;this.pan.updateMatrixWorld(true);}
  hand(side,name,target,{angle=32,wristZ=0,wristY=0,wristX=0,grip=1,release=0,scale=.14,anchor='pinch',palmUp=false}={}){
    if(!this.ready)return;const h=this.hands[side];h.root.visible=true;h.root.matrixAutoUpdate=true;h.root.position.set(0,0,0);h.root.quaternion.setFromAxisAngle(v(0,0,1),rad(angle));if(palmUp)h.root.quaternion.multiply(new T.Quaternion().setFromAxisAngle(v(0,1,0),Math.PI));h.root.scale.set(scale*h.sign,scale,scale);
    const pose=this.poses[name]||this.poses.open,blend=1-Math.exp(-Math.min(this.dt,.1)*24);
    for(const [boneName,base] of Object.entries(this.poses.open)){
      const bone=h.bones[safe(boneName)];if(!bone)continue;const q=new T.Quaternion().fromArray(base.q),q1=new T.Quaternion().fromArray((pose[boneName]||base).q);q.slerp(q1,grip);
      if(release&&this.poses.release?.[boneName])q.slerp(new T.Quaternion().fromArray(this.poses.release[boneName].q),release);
      if(boneName==='wrist.R')q.multiply(new T.Quaternion().setFromEuler(new T.Euler(rad(wristX),rad(wristY),rad(wristZ))));bone.quaternion.slerp(q,blend);
    }
    for(const mesh of h.meshes)for(const [key,index] of Object.entries(mesh.morphTargetDictionary)){const kind=key.replace(' volume','');let value=kind===name?grip*(1-release):kind==='release'?release:0;mesh.morphTargetInfluences[index]+=(value-mesh.morphTargetInfluences[index])*blend;}
    h.root.updateMatrixWorld(true);const wrist=h.bones.wristR;let center;
    if(anchor==='pinch'){const a=v(0,.6545,-.215).applyMatrix4(h.bones.index03R.matrixWorld),b=v(0,.833,-.22).applyMatrix4(h.bones.thumb02R.matrixWorld);center=a.add(b).multiplyScalar(.5);}
    else center=(anchor==='brush'?this.brushTip.clone():anchor==='pan'?v(0,4.35,-1.16):v(0,4,-.1)).applyMatrix4(wrist.matrixWorld);
    h.root.position.copy(target).sub(center);h.root.updateMatrixWorld(true);return h;
  }
  holding(retreat=0){
    if(!this.ready)return;
    const target=v(3.05/2.4,0,.07/2.4).applyMatrix4(this.pan.matrixWorld);target.x+=retreat*.8;target.y-=retreat*3;
    const right=this.hand('right','pan',target,{angle:65+T.MathUtils.radToDeg(this.pan.rotation.z),wristZ:-12,palmUp:true,anchor:'pan',grip:1-retreat});
    const left=this.hands.left;
    // Reflect the complete posed right hand about the pan's own centre plane.
    // Mirroring a mesh and independently reversing joint angles is not equivalent.
    for(const [name,bone] of Object.entries(right.bones)){left.bones[name].position.copy(bone.position);left.bones[name].quaternion.copy(bone.quaternion);left.bones[name].scale.copy(bone.scale);}
    for(let i=0;i<right.meshes.length;i++)left.meshes[i].morphTargetInfluences.splice(0,right.meshes[i].morphTargetInfluences.length,...right.meshes[i].morphTargetInfluences);
    const reflection=this.pan.matrixWorld.clone().multiply(new T.Matrix4().makeScale(-1,1,1)).multiply(this.pan.matrixWorld.clone().invert());
    left.root.visible=true;left.root.matrixAutoUpdate=false;left.root.matrix.copy(reflection).multiply(right.root.matrixWorld);left.root.updateMatrixWorld(true);
  }
  setSauceBrush(kind){if(this.brushes)this.brush=this.brushes[kind]||this.brushes.sweet;}
  diningPan(scene,origin,visible,flick=0){
    if(!visible){if(this.pan.parent===scene){this.pan.visible=false;}return;}
    if(!this.diningBody){const g=new T.Group(),mat=new T.MeshStandardMaterial({color:0x30392f,roughness:.72,metalness:.32});const base=new T.Mesh(new T.CylinderGeometry(.99,.97,.065,80),mat);base.rotation.x=Math.PI/2;base.position.z=-.012;g.add(base);const rim=new T.Mesh(new T.TorusGeometry(1,.045,12,80),mat);rim.position.z=.025;g.add(rim);this.pan.add(g);this.diningBody=g;}
    scene.add(this.pan,this.hands.right.root,this.hands.left.root);this.diningBody.visible=true;this.pan.visible=true;this.pan.position.set(origin.x,origin.y,origin.z-.11+flick*.2);this.pan.rotation.set(flick,0,0);this.pan.scale.setScalar(1);this.pan.updateMatrixWorld(true);this.dt=1/60;this.holding();
  }
  returnDiningPan(){if(this.diningBody)this.diningBody.visible=false;this.scene.add(this.pan,this.hands.right.root,this.hands.left.root);this.pan.visible=true;this.pan.position.set(0,0,0);this.pan.rotation.set(0,0,0);this.pan.scale.setScalar(1);}
  brushAt(target,grip=1){const h=this.hand('right','brush',target,{anchor:'brush',wristY:-14,grip});if(!h)return;this.brush.visible=true;this.brush.traverse(o=>{if(o.isMesh){o.renderOrder=0;o.material.depthWrite=true;}});this.brush.matrixAutoUpdate=false;this.brush.matrix.copy(h.bones.wristR.matrixWorld).multiply(this.brushMatrix);this.brush.matrixWorldNeedsUpdate=true;}
  kettleRest(target){if(!this.kettle)return;this.kettle.visible=true;this.kettle.position.copy(target);this.kettle.scale.set(-.78,.78,.52);}
  brushRest(target){if(!this.ready)return;const current=this.hands.right;this.hands.right=this.restHand;this.brushAt(target);this.restHand.root.visible=false;this.hands.right=current;this.brush.traverse(o=>{if(o.isMesh){o.renderOrder=-1;o.material.depthWrite=false;}});}
  stockCrisps(target){for(const [i,o] of (this.crispStack||[]).entries()){o.visible=true;o.position.copy(target);o.position.x+=(i-1)*.045;o.position.y+=(i-1)*.055;o.position.z+=i*.02;o.rotation.z=(i-1)*.12;o.scale.setScalar(.62);}}
  crispAt(target,roll=0){if(!this.ready)return;this.crisp.traverse(o=>{if(o.isMesh){o.material.clippingPlanes=null;o.material.depthWrite=false;o.castShadow=true;o.receiveShadow=true;}});if(!this.ready)return;this.crisp.visible=true;this.crisp.position.copy(target);this.crisp.rotation.set(roll,0,0);this.crisp.scale.setScalar(.62);}
  startFold(front,back){if(this.fold){this.scene.remove(this.fold);this.fold.geometry.dispose();this.fold.material.dispose();this.frontMap.dispose();this.backMap.dispose();}this.frontMap=new T.CanvasTexture(front);this.frontMap.colorSpace=T.SRGBColorSpace;this.backMap=new T.CanvasTexture(back);this.backMap.colorSpace=T.SRGBColorSpace;const mat=new T.MeshStandardMaterial({map:this.frontMap,side:T.DoubleSide,transparent:true,alphaTest:.025,roughness:.86,metalness:0});mat.onBeforeCompile=shader=>{shader.uniforms.backMap={value:this.backMap};shader.fragmentShader='uniform sampler2D backMap;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\nif(!gl_FrontFacing){diffuseColor.rgb=texture2D(backMap,vMapUv).rgb;}');};this.fold=new T.Mesh(new T.PlaneGeometry(1.97,1.97,72,72),mat);this.fold.castShadow=true;this.fold.receiveShadow=false;this.fold.frustumCulled=false;this.baseFold=Float32Array.from(this.fold.geometry.attributes.position.array);this.scene.add(this.fold);}
  wrapCrispAt(position,roll){this.crispAt(position);const front=-1+2*roll;this.crisp.visible=front<.72;const cut=new T.Plane(v(0,1,0),-(position.y-.03+front));this.crisp.traverse(o=>{if(o.isMesh){o.material.clippingPlanes=[cut];o.material.depthWrite=true;o.material.clipShadows=true;o.castShadow=false;o.receiveShadow=false;}});}
  foldAt(progress,fill=.045,position=v()){if(!this.fold)return;const attr=this.fold.geometry.attributes.position;for(let i=0;i<attr.count;i++){const [x,y,z]=foldedPoint(this.baseFold[i*3],this.baseFold[i*3+1],progress,fill);attr.setXYZ(i,x,y,z);}attr.needsUpdate=true;this.fold.geometry.computeVertexNormals();this.fold.position.copy(position);}
  reset(){this.leaveServing();if(this.fold){this.scene.remove(this.fold);this.fold.geometry.dispose();this.fold.material.dispose();this.frontMap.dispose();this.backMap.dispose();this.fold=null;}for(const h of Object.values(this.hands))for(const mesh of h.meshes)mesh.morphTargetInfluences.fill(0);}
  enterServing(){
    if(this.servingView)return;const group=new T.Group();this.scene.add(group);const camera=new T.PerspectiveCamera(42,this.w/this.h,.1,80);camera.up.set(0,0,1);
    const material=(color,roughness=.75)=>new T.MeshStandardMaterial({color,roughness});
    const panBody=new T.Group();this.pan.add(panBody);
    const base=new T.Mesh(new T.CylinderGeometry(1,1,.10,80),material(0x333c32));base.rotation.x=Math.PI/2;base.position.z=-.03;panBody.add(base);
    const rim=new T.Mesh(new T.TorusGeometry(1,.047,12,80),material(0x4b5447));rim.position.z=.045;panBody.add(rim);
    const plate=new T.Group();plate.position.set(0,2.3,.9);group.add(plate);
    const dish=new T.Mesh(new T.CylinderGeometry(1.08,1.01,.075,80),material(0xfff4d5,.38));dish.rotation.x=Math.PI/2;dish.scale.z=.76;plate.add(dish);
    const lip=new T.Mesh(new T.TorusGeometry(1.02,.045,12,80),material(0xfff8e8,.32));lip.scale.y=.76;lip.position.z=.04;plate.add(lip);
    const floor=new T.Mesh(new T.PlaneGeometry(30,30),material(0xd9ad6a));floor.position.z=-.65;floor.receiveShadow=true;group.add(floor);
    const wood=new T.TextureLoader().load(assets.wood);wood.colorSpace=T.SRGBColorSpace;wood.wrapS=wood.wrapT=T.RepeatWrapping;wood.repeat.set(3,3);floor.material.map=wood;
    const aim=new T.Mesh(new T.RingGeometry(.08,.105,32),new T.MeshBasicMaterial({color:0x88a64e,transparent:true,opacity:.8,side:T.DoubleSide}));aim.position.set(0,2.3,.958);group.add(aim);this.servingView={group,panBody,camera,wood,aim};this.camera=camera;
  }
  serveFrame(session,fill){
    this.enterServing();const view=this.servingView,p=session.position;
    this.brush.visible=false;this.crisp.visible=false;for(const h of Object.values(this.hands))h.root.visible=false;
    view.aim.visible=session.state==='ready';view.aim.position.x=session.aim*.74;const blend=session.state==='view'?Math.min(1,session.age/1.35):1;view.camera.position.set(0,-6*blend,3.8+1.2*blend);view.camera.lookAt(0,.7*blend,.3);view.camera.updateMatrixWorld();
    const lift=session.state==='flying'?Math.sin(Math.min(1,session.age/.3)*Math.PI)*.15:0;
    this.pan.position.set(0,-.7*blend,lift);this.pan.rotation.set(0,0,0);this.pan.scale.set(1,1,1);this.pan.updateMatrixWorld(true);
    this.holding(session.state==='view'?1-blend:0);
    this.foldAt([1,1,1],fill,v(p.x,p.y*blend,p.z));this.fold.rotation.x=session.rotation;
    this.crispAt(v(p.x,p.y*blend,p.z+.055));this.crisp.scale.y=.40;this.crisp.rotation.x=session.rotation;
    this.renderer.render(this.scene,view.camera);
  }
  servingPlateRect(){const points=[v(-1.2,1.25,.88),v(1.2,1.25,.88),v(-1.2,3.35,1.15),v(1.2,3.35,1.15)].map(p=>p.project(this.camera));const x=Math.max(0,Math.min(...points.map(p=>(p.x+1)*this.w/2))),y=Math.max(0,Math.min(...points.map(p=>(1-p.y)*this.h/2)));return {x,y,w:Math.min(this.w-x,Math.max(...points.map(p=>(p.x+1)*this.w/2))-x),h:Math.min(this.h-y,Math.max(...points.map(p=>(1-p.y)*this.h/2))-y)};}
  leaveServing(){if(!this.servingView)return;const s=this.servingView;this.scene.remove(s.group);this.pan.remove(s.panBody);for(const root of [s.group,s.panBody])root.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});s.wood.dispose();this.servingView=null;this.camera=this.topCamera;this.pan.position.set(0,0,0);if(this.fold)this.fold.rotation.set(0,0,0);}
  render(){if(this.ready)this.renderer.render(this.scene,this.camera);}
}
