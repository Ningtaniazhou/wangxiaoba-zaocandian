import * as T from 'three';
// One shared horizontal boundary per guest, after skinning and world transforms.
export function heatBoundary(heat,low,high){return low-.06+T.MathUtils.clamp(heat,0,1)*(high-low+.12);}
export function installHeatVisual(root){
 root.updateMatrixWorld(true);const box=new T.Box3().setFromObject(root);
 const uniforms={guestHeatOn:{value:0},guestHeatLine:{value:box.max.z+.06}};
 root.traverse(o=>{if(!o.isMesh)return;const convert=source=>{
  if(/Eyes|brows|Mouth|glints/i.test(source.name))return source;
  const material=source.clone();material.customProgramCacheKey=()=> 'guest-cooling-waterline-v3';
  material.onBeforeCompile=shader=>{
   Object.assign(shader.uniforms,uniforms);
   shader.vertexShader='varying float guestWorldHeight;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nguestWorldHeight=(modelMatrix*vec4(transformed,1.0)).z;');
   shader.fragmentShader='uniform float guestHeatOn;\nuniform float guestHeatLine;\nvarying float guestWorldHeight;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    float hotRegion=1.0-smoothstep(guestHeatLine-.025,guestHeatLine+.025,guestWorldHeight);
    vec3 hotColor=mix(diffuseColor.rgb,vec3(.95,.24,.18),.53);
    diffuseColor.rgb=mix(diffuseColor.rgb,hotColor,guestHeatOn*hotRegion);`);
  };return material;
 };o.material=Array.isArray(o.material)?o.material.map(convert):convert(o.material);});
 return {uniforms,update(heat,everHot){uniforms.guestHeatOn.value=everHot&&heat>0?1:0;uniforms.guestHeatLine.value=heatBoundary(heat,box.min.z,box.max.z);}};
}
