// Wait for a full visible second, then use one fresh reading as the existing
// neutral-angle calculation. Hiding/covering the banner restarts the delay.
export class CalibrationGate {
  constructor(){this.pending=false;this.since=null;}
  begin(){this.pending=true;this.since=null;}
  cancel(){this.pending=false;this.since=null;}
  tick(now,visible,sampleAt){
    if(!this.pending)return false;
    if(!visible){this.since=null;return false;}
    if(this.since===null)this.since=now;
    if(now-this.since<1000||sampleAt<this.since||now-sampleAt>300)return false;
    this.cancel();return true;
  }
}
export function pointerInGame(x,y,vw,vh,w,h,angle){
  const a=angle*Math.PI/180,dx=x-vw/2,dy=y-vh/2;
  return {x:dx*Math.cos(a)+dy*Math.sin(a)+w/2,y:-dx*Math.sin(a)+dy*Math.cos(a)+h/2};
}
export function panLayout(w,h){
  const radius=Math.min(w*.265,h*.35,(h-48)/2.5425,365),bannerBottom=30;
  return {x:w/2,y:Math.max(h*.455,bannerBottom+12+radius*1.08),radius};
}
