export class OpeningTour {
 constructor(){this.active=false;this.phase='done';this.age=0;}
 begin(){this.active=true;this.phase='loading';this.age=0;}
 update(dt,ready){if(!this.active)return null;if(this.phase==='loading'){if(!ready)return null;this.phase='guests';this.age=0;return 'guests';}this.age+=Math.max(0,Math.min(dt,.1));if(this.phase==='guests'&&this.age>=2.8){this.phase='return';this.age=0;return 'return';}if(this.phase==='return'&&this.age>=1.3){this.finish();return 'done';}return null;}
 get progress(){if(this.phase!=='return')return 0;const t=Math.min(1,this.age/1.3);return t*t*(3-2*t);}
 finish(){this.active=false;this.phase='done';this.age=0;}
}
// The dining view must not duplicate the chef's real cooking station.
export function removeChefPreview(root){const names=['Chef counter','Layout iron pan','Crisp plate near chef','Thin crisp layout'].map(n=>n.replace(/[ _]/g,''));const remove=[];root.traverse(o=>{if(names.includes(o.name.replace(/[ _]/g,'')))remove.push(o);});for(const o of remove)o.removeFromParent();return remove;}

// Permission APIs are invoked synchronously from the click. Play only after both
// dialogs finish; waiting for the actual audio end prevents the intro from racing it.
export async function prepareOpening({sound,requestMotion,requestMicrophone}){
 sound.start();
 const [enabled]=await Promise.all([requestMotion(),requestMicrophone()]);
 await sound.resume();
 await sound.reaction('yawn',{priority:true});
 return enabled;
}
