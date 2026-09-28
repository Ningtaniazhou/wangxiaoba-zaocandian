import { surfaceToast, smoothstep } from './appearance.9f7265756857.mjs';
// A conservative height-field with fixed cooked material and mobile raw batter.
// Cooking is deliberately game-scaled, not a food safety or kitchen model.
export class Batter {
  constructor(n=92) { this.n=n; this.h=new Float32Array(n*n); this.energy=new Float32Array(n*n); this.gel=new Float32Array(n*n); this.stuck=new Float32Array(n*n); this.set=new Float32Array(n*n); this.brown=new Float32Array(n*n); this.valid=new Uint8Array(n*n); this.time=0; this.transportX=0; this.transportY=0; this.transportTravel=0; this.poured=false; for(let y=0;y<n;y++)for(let x=0;x<n;x++)this.valid[y*n+x]=Math.hypot(x-(n-1)/2,y-(n-1)/2)<n*.47; }
  pour(){
    if(this.poured)return;this.poured=true;
    const n=this.n,c=(n-1)/2,oldRadius=n*.18,radius=n*.15;let amount=0,weight=0;
    for(let y=0;y<n;y++)for(let x=0;x<n;x++){
      const r=Math.hypot(x-c,y-c),i=y*n+x;
      if(r<oldRadius)amount+=2.8*(1-(r/oldRadius)**2);
      if(r<radius){this.h[i]=1-(r/radius)**2;weight+=this.h[i];}
    }
    // A smaller initial puddle with exactly the same serving, not less batter.
    const peak=amount/weight;for(let i=0;i<this.h.length;i++)this.h[i]*=peak;
  }
  getCook(i){return this.h[i]>.005?this.set[i]/this.h[i]:0;}
  step(dt,tiltX=0,tiltY=0,heat=1){if(!this.poured)return;dt=Math.min(dt,.04);this.time+=dt;const n=this.n,h=this.h,e=this.energy;
    // Contact leaves a thin attached film immediately, well before the whole
    // thickness cooks. Only the liquid above this film may move away.
    for(let i=0;i<h.length;i++){
      if(h[i]>.006){
        const film=Math.min(h[i],.085);
        this.stuck[i]=Math.min(h[i],this.stuck[i]+Math.max(0,film-this.stuck[i])*(1-Math.exp(-dt*(6+heat*3))));
      }
    }
    // Pairwise flux, capped at mobile volume; attached film stays at this cell.
    for(let pass=0;pass<2;pass++)for(let yy=0;yy<n;yy++)for(let xx=0;xx<n;xx++){const y=pass?n-1-yy:yy,x=pass?n-1-xx:xx,i=y*n+x;if(!this.valid[i])continue;for(let axis=0;axis<2;axis++){if(axis===0&&x===n-1||axis===1&&y===n-1)continue;let j=i+(axis===0?1:n);if(!this.valid[j]||(h[i]<.0001&&h[j]<.0001))continue;const slope=(h[i]-h[j])*3.4+(axis===0?tiltX:tiltY)*.18;const a=slope>0?i:j,b=slope>0?j:i;if(h[a]<.0001)continue;const raw=Math.max(0,h[a]-this.set[a]);
      const mobile=Math.max(0,h[a]-Math.max(this.stuck[a],this.set[a]));
      const cook=this.set[a]/h[a],gel=raw>1e-9?Math.min(1,this.gel[a]/raw):0;
      const mobility=liquidMobility(mobile,cook,gel);
      const yieldSlope=.035+.045*cook*cook+.025*gel;
      const flow=Math.min(mobile*.23,Math.max(0,Math.abs(slope)-yieldSlope)*dt*6.4)*mobility;
      if(flow<=0)continue;
      // Thickening travels with liquid; moving into another cell cannot reset it.
      const heatFlow=raw>1e-9?flow*this.energy[a]/raw:0;this.energy[a]=Math.max(0,this.energy[a]-heatFlow);this.energy[b]+=heatFlow;
      const gelFlow=flow*gel;this.gel[a]=Math.max(0,this.gel[a]-gelFlow);this.gel[b]+=gelFlow;
      h[a]-=flow;h[b]+=flow;const signed=a===i?flow:-flow;if(axis===0)this.transportX+=signed;else this.transportY+=signed;this.transportTravel+=flow;}}
    for(let i=0;i<h.length;i++){if(h[i]<.003)continue;let x=i%n,y=Math.floor(i/n),r=Math.hypot(x-(n-1)/2,y-(n-1)/2)/(n*.47);const localHeat=heat*(1.05-.22*r);// Heat sets material from the bottom upward. The remaining raw layer
      // stays mobile even when most of this column has cooked.
      const rawBefore=Math.max(0,h[i]-this.set[i]);
      // Warmth belongs to the remaining liquid and is advected with it. It is a
      // normalized game-scale thermal state, not degrees Celsius.
      const temperature=rawBefore>1e-9?Math.min(1,e[i]/rawBefore):0;
      const warmed=1-(1-temperature)*Math.exp(-dt*localHeat*.055/(.15+rawBefore));
      const hotThin=(1-smoothstep(.06,.22,rawBefore))*smoothstep(.55,.85,warmed)*smoothstep(.085,.16,this.set[i]);
      this.set[i]=Math.min(h[i],this.set[i]+dt*localHeat*(.006+rawBefore*.018+.032*hotThin));
      const rawAfter=Math.max(0,h[i]-this.set[i]);
      const remainingGel=rawBefore>1e-9?Math.max(0,this.gel[i])*rawAfter/rawBefore:0;
      this.gel[i]=Math.min(rawAfter,remainingGel+(rawAfter-remainingGel)*(1-Math.exp(-dt*localHeat*.04)));
      e[i]=rawAfter*warmed;
      this.brown[i]+=dt*.018*localHeat*Math.max(0,(this.getCook(i)-.92)/.08);}
  }
  stats(){let area=0,total=0,raw=0,rawArea=0,burnt=0,crisp=0,cx=0,cy=0,perimeter=0;const n=this.n;for(let i=0;i<this.h.length;i++){let h=this.h[i];if(h<.025)continue;area++;if(this.getCook(i)<.92)rawArea++;total+=h;cx+=(i%n)*h;cy+=Math.floor(i/n)*h;raw+=Math.max(0,h-this.set[i]);if(this.getCook(i)>=.92&&surfaceToast(this.getCook(i),this.brown[i],h)>.65)burnt++;if(this.brown[i]>.12)crisp+=h;for(let j of [i-1,i+1,i-n,i+n])if(j<0||j>=this.h.length||this.h[j]<.025)perimeter++;}return {area,total,undercookedArea:area?rawArea/area:0,raw:total?raw/total:0,burnt:area?burnt/area:0,crisp:total?crisp/total:0,roundness:perimeter?Math.min(1,4*Math.PI*area/(perimeter*perimeter)*1.6):0,cx:total?cx/total:0,cy:total?cy/total:0,time:this.time};}
}

// Game-scale rheology: warm/partly set liquid resists motion. A thin cap loses
// mobility quadratically, including the transfer cap, so fractional speed also falls.
export function liquidMobility(mobile,cook,gel) {
  const layer=Math.min(1,Math.max(0,mobile)/.05);
  return layer*layer/(1+4*cook*cook+4*gel*gel);
}
