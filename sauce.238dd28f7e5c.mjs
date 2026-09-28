// Conservative thin-film sauce model. Height is sauce volume per occupied cell.
// A loaded brush adds a finite serving; a dry brush only transports existing sauce.
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export class Sauce {
  constructor(n,mask){this.n=n;this.mask=Uint8Array.from(mask,x=>x?1:0);this.h=new Float32Array(n*n);this.load=0;this.added=0;this.dips=0;this.appliedDips=0;this.dipApplied=false;this.distance=0;this.revision=0;}
  dip(){this.load=135;this.dipApplied=false;this.dips++;return this.load;}
  stroke(a,b,pressure=.6){
    const n=this.n,dx=(b.x-a.x)*n/2,dy=(b.y-a.y)*n/2,d=Math.hypot(dx,dy),steps=Math.max(1,Math.ceil(d/.8)),r=n*.054;
    const ux=d?dx/d:0,uy=d?dy/d:0;let moved=0;
    for(let k=1;k<=steps;k++){
      const t=k/steps,cx=((a.x+(b.x-a.x)*t)+1)*n/2-.5,cy=((a.y+(b.y-a.y)*t)+1)*n/2-.5;
      const cells=[];let weights=0;
      for(let y=Math.max(0,Math.floor(cy-r-2));y<=Math.min(n-1,Math.ceil(cy+r+2));y++)for(let x=Math.max(0,Math.floor(cx-r-2));x<=Math.min(n-1,Math.ceil(cx+r+2));x++){
        const i=y*n+x;if(!this.mask[i])continue;
        const noise=.06*Math.sin(x*2.1+y*.7)+.04*Math.sin(y*2.7-x*.9),q=Math.hypot((x-cx)/r,(y-cy)/(r*.83));
        const weight=clamp((1+noise-q)/.23,0,1)*(0.93+.07*Math.sin(x*3.1+y*1.7));if(weight){cells.push([i,weight]);weights+=weight;}
      }
      if(!weights)continue;
      const amount=Math.min(this.load,(d/steps*.53+.035)*1.5*clamp(pressure,.2,1));
      for(const [i,v] of cells)this.h[i]+=amount*v/weights;
      if(amount>0&&!this.dipApplied){this.appliedDips++;this.dipApplied=true;}this.load-=amount;this.added+=amount;
      // Pressure squeezes high spots sideways; bristles drag the mobile layer.
      for(let pass=0;pass<4;pass++)for(const [i,weight] of cells){
        const x=i%n,y=Math.floor(i/n);
        for(const [j,drive] of [[x<n-1?i+1:-1,ux],[y<n-1?i+n:-1,uy]]){
          if(j<0||!this.mask[j])continue;
          const slope=(this.h[i]-this.h[j])*2.4+drive*.075*Math.min(1,d/steps),from=slope>0?i:j,to=slope>0?j:i;
          const mobile=Math.max(0,this.h[from]-.002),flow=Math.min(mobile*.23,Math.max(0,Math.abs(slope)-.002)*.31*weight);
          this.h[from]-=flow;this.h[to]+=flow;moved+=flow;
        }
      }
    }
    this.distance+=d/n*2;this.revision++;return moved;
  }
  settle(dt){
    dt=Math.min(dt,.04);const n=this.n;
    for(let y=0;y<n;y++)for(let x=0;x<n;x++){
      const i=y*n+x;if(!this.mask[i])continue;
      for(const j of [x<n-1?i+1:-1,y<n-1?i+n:-1]){
        if(j<0||!this.mask[j])continue;const diff=this.h[i]-this.h[j];if(Math.abs(diff)<.004)continue;
        const a=diff>0?i:j,b=diff>0?j:i,flow=Math.min(Math.max(0,this.h[a]-.002)*.1,(Math.abs(diff)-.004)*dt*.45);this.h[a]-=flow;this.h[b]+=flow;
      }
    }
    this.revision++;
  }
  stats(){let total=0,area=0,covered=0,peak=0;for(let i=0;i<this.h.length;i++){if(this.mask[i])area++;const v=this.h[i];total+=v;if(v>.008)covered++;peak=Math.max(peak,v);}return {total,coverage:area?covered/area:0,covered,peak,mean:covered?total/covered:0,load:this.load,dips:this.dips};}
}
