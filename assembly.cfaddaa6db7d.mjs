import {BrushStrokes} from './brush-strokes.c525e952d36a.mjs';
import {Serving} from './serving.04c844cb058e.mjs';
import {Recipe} from './recipe.e5ce8fdbde39.mjs';
import {Sauce} from './sauce.238dd28f7e5c.mjs';
import {saucePixels} from './sauce-color.201fe50f8e93.mjs';
import {Kitchen3D} from './kitchen3d.32943b0937a4.mjs';
import {assets} from './runtime-assets.8068bdb05f67.mjs';
const $=id=>document.getElementById(id),clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x);},lerp=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:(a.z||0)+((b.z||0)-(a.z||0))*t});
export class Assembly {
  constructor(api){
    this.api=api;this.images={};for(const key of ['tray','plate','wood','scallion0','cilantro0','cilantro1','cilantro2']){const im=new Image();im.src=assets[key];this.images[key]=im;}
    this.strokes=new BrushStrokes();this.active=false;this.placed=false;this.serving=null;this.recipe=new Recipe();this.action=null;this.pieces=[];this.foldProgress=[0,0,0];this.foldStarted=false;this.brushSelected=false;this.pointer=null;this.sauceCanvas=document.createElement('canvas');this.error=false;
    try{this.hands=new Kitchen3D($('handsScene'));this.hands.load().then(()=>{this.resize();this.refresh();}).catch(e=>{this.error=true;console.error('Kitchen models failed',e);});}catch(e){this.error=true;console.error('3D unavailable',e);}
    $('sauceButton').onclick=()=>this.dip();$('chiliButton').onclick=()=>this.dip('chili');$('scallionButton').onclick=()=>this.garnish('scallions');$('cilantroButton').onclick=()=>this.garnish('cilantro');$('crispButton').onclick=()=>this.placeCrisp();$('nextStep').onclick=()=>this.next();this.resize();this.refresh();
  }
  get busy(){return !!this.action;}
  resize(){const {w,h,px,py,rx:r}=this.api.get();const rightSpace=Math.max(80,w-20-(px+r*1.2)),traySize=Math.min(h*.60,rightSpace),trayX=w-18-traySize,top=Math.max(44,py-r*.99);this.tray={x:trayX,y:top,size:traySize};this.plate={x:Math.max(16,(px-r*1.22)*.43),y:Math.min(h*.67,top+h*.47),size:Math.min(h*.43,(px-r*1.22)*.84)};
    const slot=(id,x,y,width,height)=>Object.assign($(id).style,{left:`${x}px`,top:`${y}px`,width:`${width}px`,height:`${height}px`});
    slot('scallionButton',trayX+traySize*.09,top+traySize*.04,traySize*.40,traySize*.43);slot('cilantroButton',trayX+traySize*.52,top+traySize*.04,traySize*.40,traySize*.43);slot('sauceButton',trayX+traySize*.10,top+traySize*.51,traySize*.38,traySize*.44);slot('chiliButton',trayX+traySize*.54,top+traySize*.51,traySize*.38,traySize*.44);
    slot('crispButton',this.plate.x-this.plate.size/2,this.plate.y-this.plate.size/2,this.plate.size,this.plate.size);
    slot('kettleButton',this.plate.x-this.plate.size*.45,Math.max(40,py-r*1.02),this.plate.size*1.26,Math.max(50,this.plate.size*.95));
    this.hands?.resize(w,h,px,py,r);
  }
  world(pixel,z=.1){const {px,py,rx}=this.api.get();return {x:(pixel.x-px)/rx,y:(py-pixel.y)/rx,z};}
  trayPoint(kind,z=.22){const t=this.tray;const p=kind==='scallions'?[.304,.282]:kind==='cilantro'?[.729,.282]:kind==='chili'?[.73,.725]:[.29,.725];return this.world({x:t.x+t.size*p[0],y:t.y+t.size*p[1]},z);}
  platePoint(){return this.world(this.plate,.09);}
  vector(p){return this.hands.point({x:this.api.get().px+p.x*this.api.get().rx,y:this.api.get().py-p.y*this.api.get().rx},p.z||0);}
  start(){
    if(this.active)return false;if(!this.hands?.ready){$('hint').textContent=this.error?'加载失败，请刷新重试。':'正在准备，请稍候。';return false;}
    const {sim}=this.api.get();if(!sim.poured)return false;this.active=true;this.recipe.start();this.sauce=new Sauce(sim.n,sim.h.map(x=>x>.018));this.chili=new Sauce(sim.n,sim.h.map(x=>x>.018));this.sauceKind='sweet';this.sauceCanvas.width=this.sauceCanvas.height=sim.n;this.action={type:'retract',age:0,duration:.85};this.recipe.busy=true;this.api.onStart();this.refresh();return true;
  }
  reset(){this.strokes.clear();this.active=false;this.placed=false;this.serving=null;this.recipe=new Recipe();this.sauce=null;this.chili=null;this.sauceKind='sweet';this.action=null;this.pieces=[];this.foldProgress=[0,0,0];this.foldStarted=false;this.brushSelected=false;this.pointer=null;this.brushCursor=null;this.brushTarget=null;this.brushDown=false;this.contact=false;this.hands?.reset();this.refresh();}
  refresh(){const s=this.recipe.stage,busy=this.busy,enabled=this.active&&this.hands?.ready;
    $('ingredients').classList.toggle('hidden',!!this.serving);$('basicTools').classList.toggle('hidden',this.active);$('assemblyTools').classList.toggle('hidden',!this.active);$('heatControl').classList.toggle('hidden',this.active);$('stoveKnob').disabled=this.active;
    $('sauceButton').disabled=!enabled||busy||!['sauce','greens'].includes(s);$('chiliButton').disabled=$('sauceButton').disabled;$('scallionButton').disabled=!enabled||busy||!['sauce','greens'].includes(s);$('cilantroButton').disabled=!enabled||busy||!['sauce','greens'].includes(s);$('crispButton').disabled=!enabled||busy||!['sauce','greens','crisp'].includes(s)||this.recipe.crisp;
    $('scallionLabel').textContent='葱花';$('cilantroLabel').textContent='香菜';$('sauceLabel').textContent='面酱';
    const labels={sauce:['刷好了，选小料','还想加酱？再蘸一点'],greens:['小料够了，放薄脆','葱花、香菜都可以不放'],crisp:['拿一片薄脆','加点酥脆'],fold:['卷饼中…','马上就好'],serving:[this.serving?.state==='ready'?'颠锅上菜 ↑':'准备上菜…','短促抬手机，或向上划 / 点按钮']};const label=labels[s]||['',''];$('nextLabel').textContent=label[0];$('nextHelp').textContent=label[1];$('nextStep').disabled=!enabled||busy||['fold','serving'].includes(s);$('nextLabel').textContent='卷饼上菜';$('nextHelp').textContent='';
  }
  get activeSauce(){return this.sauceKind==='chili'?this.chili:this.sauce;}
  dip(kind='sweet'){if(!this.active||this.busy)return;if(this.recipe.stage==='greens')this.recipe.moreSauce();if(this.recipe.stage!=='sauce')return;this.strokes.clear();this.pointer=null;this.brushDown=false;const carried=this.brushSelected&&this.sauceKind===kind;this.sauceKind=kind;const bowl=this.trayPoint(kind);this.action={type:'dip',carried,age:0,duration:1.35,from:carried&&this.brushCursor?{...this.brushCursor,z:.3}:this.world({x:this.api.get().w+100,y:this.api.get().h+150},.5),bowl};this.recipe.busy=true;this.refresh();}
  garnish(kind){if(!this.recipe.add(kind))return;this.strokes.clear();this.brushSelected=false;this.brushDown=false;this.pointer=null;this.contact=false;const k=this.recipe.scallions+this.recipe.cilantro;this.action={type:'garnish',kind,age:0,duration:2.35,from:this.trayPoint(kind),to:{x:Math.sin(k*2.4)*.30,y:Math.cos(k*1.7)*.22,z:.54},released:false};this.recipe.busy=true;this.refresh();}
  placeCrisp(){if(!this.active||this.recipe.crisp||this.busy||!['sauce','greens','crisp'].includes(this.recipe.stage))return;this.strokes.clear();this.recipe.stage='crisp';this.brushSelected=false;this.action={type:'crisp',age:0,duration:2.25,from:{...this.platePoint(),y:this.platePoint().y-.12,z:.128},to:{x:0,y:-.09,z:.083}};this.recipe.busy=true;this.refresh();}
  next(){this.api.requestServe?.();}
  serveNow(){if(this.busy)return false;if(!this.active&&!this.start())return false;this.strokes.clear();this.action=null;this.recipe.busy=false;this.brushSelected=false;this.brushDown=false;this.pointer=null;this.recipe.stage='fold';this.action={type:'handsClear',age:0,duration:.6};this.recipe.busy=true;this.refresh();return true;}
  startFold(){if(this.foldStarted)return;this.foldStarted=true;const front=document.createElement('canvas'),back=document.createElement('canvas');front.width=front.height=back.width=back.height=512;this.api.renderSkin(back.getContext('2d'),256,256,252,252);front.getContext('2d').drawImage(back,0,0);this.drawFood(front.getContext('2d'),256,256,252,252);this.hands.startFold(front,back);}
  commitFold(){if(this.busy||this.recipe.stage!=='fold')return;this.startFold();const i=this.recipe.fold;this.action={type:'fold',age:0,duration:1.1,index:i,from:this.foldProgress[i]};this.recipe.busy=true;this.pointer=null;this.refresh();}
  inputDown(point,e){if(!this.active||(this.busy&&this.action?.type!=='dip'))return this.active;if(this.serving){if(this.serving.state==='ready')this.pointer={id:e.pointerId,serve:true,start:point,last:point};return true;}const {px,py,rx}=this.api.get(),p={x:(point.x-px)/rx,y:(point.y-py)/rx};if(Math.hypot(p.x,p.y)>1.03)return true;
    if(this.recipe.stage==='sauce'){if(!this.brushSelected&&this.action?.type!=='dip'){$('hint').textContent='点酱碗，蘸点酱。';return true;}this.pointer={id:e.pointerId};this.brushDown=true;this.brushTarget={x:p.x,y:-p.y,z:.13};this.contact=false;this.pressure=e.pressure||.6;this.strokes.begin(this.brushTarget,this.pressure);}
    return true;
  }
  inputMove(point,e){if(!this.pointer||this.pointer.id!==e.pointerId)return;if(this.pointer.serve){this.pointer.last=point;this.serving.aim=clamp((point.x-this.api.get().px)/this.api.get().rx,-.85,.85);return;}const {px,py,rx}=this.api.get(),p={x:clamp((point.x-px)/rx,-1.02,1.02),y:clamp((point.y-py)/rx,-1.02,1.02)};this.brushTarget={x:p.x,y:-p.y,z:.13};this.strokes.move(this.brushTarget);}
  inputUp(){if(this.pointer?.serve){if(this.pointer.start.y-this.pointer.last.y>25)this.serving.launch();this.pointer=null;return;}this.strokes.end();this.pointer=null;}
  makePieces(kind,to){const count=kind==='scallions'?14:10;for(let j=0;j<count;j++){const angle=j*2.399+this.pieces.length*.3,rr=.10+.30*((j*17)%13)/13;let x=to.x+Math.cos(angle)*rr,y=-to.y+Math.sin(angle)*rr;const {sim}=this.api.get();const valid=(x,y)=>{const ix=Math.floor((x+1)*sim.n/2),iy=Math.floor((y+1)*sim.n/2);return ix>=0&&iy>=0&&ix<sim.n&&iy<sim.n&&sim.h[iy*sim.n+ix]>.018;};if(!valid(x,y)){const ids=sim.h.map((v,i)=>v>.04?i:-1).filter(i=>i>=0);const id=ids[(j*29)%ids.length];x=(id%sim.n+.5)/sim.n*2-1;y=(Math.floor(id/sim.n)+.5)/sim.n*2-1;}this.pieces.push({kind,x,y,fromX:to.x,fromY:-to.y,age:-j*.013,size:(kind==='scallions'?.105:.10)*(1+(j%3)*.16),angle,variant:j%3});}if(this.pieces.length>400)this.pieces.splice(0,this.pieces.length-400);}
  update(dt){if(!this.active)return;if(this.serving){if(this.serving.update(dt)&&!this.placed){this.placed=true;this.api.sound?.catchPlate?.();this.api.onServed();}this.refresh();this.hint();return;}if(this.action){const a=this.action;a.age+=dt;const t=clamp(a.age/a.duration);
      if(a.type==='garnish'&&t>.63&&!a.released){a.released=true;this.makePieces(a.kind,a.to);this.api.sound?.sprinkle?.();}
      if(a.type==='fold')this.foldProgress[a.index]=a.from+(1-a.from)*ease(t);if(a.type==='unfold')this.foldProgress[a.index]=a.from*(1-ease(t));
      if(t>=1){this.action=null;this.recipe.busy=false;if(a.type==='dip'){this.activeSauce.dip();this.brushSelected=true;this.brushCursor={...a.bowl,z:.28};this.brushTarget={...this.brushCursor};}if(a.type==='crisp'){this.recipe.placeCrisp();this.api.sound?.crunch?.();this.recipe.busy=false;}if(a.type==='handsClear')this.commitFold();if(a.type==='fold'){this.recipe.foldNext();if(this.recipe.stage==='serving'){this.recipe.busy=false;this.action=null;this.api.onReady?.();}else this.commitFold();}if(a.type==='plating'){this.placed=true;this.api.onServed();}this.refresh();}
    }
    if(this.recipe.stage==='sauce'&&this.brushSelected&&!this.busy){const result=this.strokes.step(this.brushCursor,dt,(a,b,pressure)=>{this.api.sound?.brush?.();this.activeSauce.stroke({x:a.x,y:-a.y},{x:b.x,y:-b.y},pressure);});this.brushCursor=result.cursor;this.brushDown=this.contact=result.contact;}

    if(!this.foldStarted){this.sauce?.settle(dt);this.chili?.settle(dt);}for(const p of this.pieces)p.age+=dt;this.uiClock=(this.uiClock||0)+dt;if(this.uiClock>.15){this.uiClock=0;this.refresh();}this.hint();
  }
  hint(){if(this.serving){$('hint').textContent={view:'卷好了，准备上菜！',ready:'左右倾斜瞄准，短促抬手机上菜；也可向上划或点按钮。',flying:'接住这一口香！',miss:'差一点，再试一次！',landed:'接住了，开饭啦！'}[this.serving.state];return;}const s=this.recipe.stage;if(this.busy){const t=this.action.type;$('hint').textContent={retract:'关火了，准备刷酱。',dip:this.sauceKind==='chili'?'蘸点辣酱。':'蘸点面酱。',returnBrush:'葱花、香菜，随你喜欢。',garnish:this.action.kind==='scallions'?'撒点葱花。':'撒点香菜。',crisp:'放上薄脆。',handsClear:'准备卷饼。',fold:'卷起来，包住香味。',unfold:'再试一次，把饼边向提示方向拖动。',plating:'卷好啦，轻轻放进盘子里。'}[t];return;}
    let text;if(s==='sauce'){const st=this.activeSauce.stats();text=!this.brushSelected?'配料随你喜欢，做好就点「卷饼上菜」。':st.load<1?'酱不多了，点酱碗再蘸一点。':st.coverage>=.14?'可以继续加小料，或点「卷饼上菜」。':'在饼上来回拖动，把酱刷匀。';}else if(s==='greens')text='点小料加一撮；不想加就点「小料够了」。';else if(s==='crisp')text='点盘子，放上薄脆。';else if(s==='fold')text='卷饼中，马上就好。';if(text)$('hint').textContent=text;
  }
  drawUnder(c){const {w,h}=this.api.get();if(!this.steelCounter||this.steelCounter.width!==w||this.steelCounter.height!==h){const metal=document.createElement('canvas');metal.width=w;metal.height=h;const p=metal.getContext('2d'),g=p.createLinearGradient(0,0,w,h);g.addColorStop(0,'#c5c9c4');g.addColorStop(.24,'#eeeae0');g.addColorStop(.52,'#b8bfbd');g.addColorStop(.76,'#e2e4dd');g.addColorStop(1,'#b0b8b5');p.fillStyle=g;p.fillRect(0,0,w,h);for(let y=0;y<h;y+=2){p.fillStyle=y%6===0?'#ffffff14':'#4c595407';p.fillRect(0,y,w,1);}p.strokeStyle='#68716c';p.lineWidth=3;p.strokeRect(9,9,w-18,h-18);p.strokeStyle='#fff9';p.lineWidth=2;p.strokeRect(13,13,w-26,h-26);p.fillStyle='#893d2e';p.fillRect(0,0,w,6);for(const x of [20,w-20])for(const y of [22,h-22]){p.beginPath();p.arc(x,y,3,0,Math.PI*2);p.fillStyle='#858d88';p.fill();p.fillStyle='#e7e9e3';p.fillRect(x-2,y-1,4,1);}this.steelCounter=metal;}c.drawImage(this.steelCounter,0,0);const t=this.tray,plate=this.images.plate;if(plate.complete&&plate.naturalWidth)c.drawImage(plate,this.plate.x-this.plate.size/2,this.plate.y-this.plate.size/2,this.plate.size,this.plate.size);if(this.images.tray.complete&&this.images.tray.naturalWidth)c.drawImage(this.images.tray,t.x,t.y,t.size,t.size);
    const spr=this.images.scallion0;if(spr.complete&&spr.naturalWidth){if(!this.onionPile){this.onionPile=document.createElement('canvas');this.onionPile.width=this.onionPile.height=192;const p=this.onionPile.getContext('2d');p.beginPath();p.roundRect(0,0,192,192,16);p.clip();for(let i=0;i<180;i++){const x=(i%12)*17+Math.sin(i*2.4)*5,y=Math.floor(i/12)*14+Math.cos(i*1.7)*5,sz=48+(i%3)*7;p.save();p.translate(x,y);p.rotate(i*2.4);p.drawImage(spr,-sz/2,-sz/2,sz,sz);p.restore();}}c.drawImage(this.onionPile,t.x+t.size*.135,t.y+t.size*.155,t.size*.34,t.size*.255);}}

  drawFood(c,cx,cy,rx,ry){if(!this.sauce)return;const n=this.sauce.n,sc=this.sauceCanvas.getContext('2d'),im=sc.createImageData(n,n);saucePixels(this.sauce,this.chili,im.data);sc.putImageData(im,0,0);c.drawImage(this.sauceCanvas,cx-rx,cy-ry,rx*2,ry*2);
    for(const p of this.pieces){if(p.age<0)continue;const t=ease(p.age/.38),x=p.fromX+(p.x-p.fromX)*t,y=p.fromY+(p.y-p.fromY)*t,img=this.images[p.kind==='scallions'?'scallion0':'cilantro'+p.variant];if(!img.complete||!img.naturalWidth)continue;const size=p.size*(1+.22*(1-t));c.save();c.translate(cx+x*rx,cy+y*ry);c.rotate(p.angle+t*.6);c.shadowColor='#40301638';c.shadowBlur=2*(1-t);c.shadowOffsetY=2*(1-t);c.drawImage(img,-size*rx/2,-size*ry/2,size*rx,size*ry);c.restore();}
  }
  draw3D(dt,tx,ty){const H=this.hands;if(!H?.ready)return;H.begin(dt,this.active?0:tx,this.active?0:ty);if(this.serving){H.serveFrame(this.serving,.035+Math.min(.10,(this.recipe.scallions+this.recipe.cilantro)*.009));return;}const bowl=this.trayPoint('sauce'),plate=this.platePoint();H.setSauceBrush?.('sweet');H.brushRest(this.vector(bowl));H.setSauceBrush?.('chili');H.brushRest(this.vector(this.trayPoint('chili')));H.setSauceBrush?.(this.sauceKind||'sweet');H.stockCrisps?.(this.vector({...plate,z:.04}));H.kettleRest?.(this.vector(this.world({x:this.plate.x+this.plate.size*.18,y:Math.max(65,this.api.get().py-this.api.get().rx*.70)},-.25)));if(!this.recipe.crisp)H.crispAt(this.vector({...plate,z:.10}));
    if(!this.active)H.holding();else{const a=this.action,t=a?clamp(a.age/a.duration):0;
      if(a?.type==='retract')H.holding(ease(t));
      if(a?.type==='dip'||a?.type==='returnBrush'){
        const bowlPoint={...a.bowl};
        if(a.type==='returnBrush'){
          if(t<.6)H.brushAt(this.vector(lerp(a.from,bowlPoint,ease(t/.6))));
          else {const p=lerp(bowlPoint,{x:3.6,y:-4,z:.5},ease((t-.66)/.34));H.hand('right','brush',this.vector(p),{anchor:'brush',wristY:-14,grip:1-ease((t-.6)/.2)});}
        }else {const p=lerp(a.from,bowlPoint,ease(t/.6));if(a.carried||t>=.76)H.brushAt(this.vector(p));else H.hand('right','brush',this.vector(p),{anchor:'brush',wristY:-14,grip:ease((t-.48)/.28)});}
      }
      else if(this.brushSelected&&this.recipe.stage==='sauce'&&!a)H.brushAt(this.vector({...this.brushCursor,z:(this.brushDown&&this.contact)? .055:.30}));
      if(a?.type==='garnish'||a?.type==='crisp'){
        const side=a.type==='crisp'?'left':'right',off={x:side==='left'?-3.6:3.6,y:-4,z:.65},source={...a.from,z:a.type==='crisp'?.128:.20};let p;
        if(t<.32)p=lerp(off,source,ease(t/.32));else if(t<.48)p={...source,z:source.z+ease((t-.32)/.16)*(.65-source.z)};else if(t<.7)p=lerp({...source,z:.65},{...a.to,z:.55},ease((t-.48)/.22));else if(t<.84)p={...a.to,z:.55-(a.type==='crisp'?.47:0)*ease((t-.7)/.14)};else p=lerp({...a.to,z:a.type==='crisp'?.08:.55},off,ease((t-.84)/.16));
        const grip=ease(t/.32)*(1-ease((t-.84)/.16));H.hand(side,a.type==='crisp'?'crisp':'pinch',this.vector(p),{angle:side==='left'?-25:25,grip,release:a.type==='garnish'?ease((t-.7)/.14):0});
        if(a.type==='crisp'){const where=t<.32?{...plate,z:.10}:t<.84?{x:p.x,y:p.y+.12,z:p.z-.028}:{x:0,y:.03,z:.055};H.crispAt(this.vector(where));}
      }
      if(this.recipe.crisp&&!this.foldStarted)H.crispAt(this.vector({x:0,y:.03,z:.055}));
      if(this.foldStarted){const fill=.035+Math.min(.10,(this.recipe.scallions+this.recipe.cilantro)*.009),roll=this.foldProgress[2];let center={x:0,y:0,z:0};if(a?.type==='plating')center=lerp({x:0,y:0,z:.4*Math.sin(t*Math.PI)},plate,ease(t));else if(this.placed)center=plate;H.foldAt(this.foldProgress,fill,this.vector(center));if(this.recipe.crisp)H.wrapCrispAt(this.vector({x:center.x,y:center.y+.03,z:center.z+.055}),roll);

      }
    }H.render();
  }
  resultPlate(c){const {rx}=this.api.get(),H=this.hands;if(!this.foldStarted||!H?.ready)return false;this.draw3D(.016,0,0);const im=this.images.plate;c.clearRect(0,0,380,230);c.drawImage(im,50,-10,280,280);if(this.serving){const H=this.hands,ratio=H.renderer.getPixelRatio(),r=H.servingPlateRect(),scale=Math.min(350/r.w,205/r.h);c.drawImage(H.renderer.domElement,r.x*ratio,r.y*ratio,r.w*ratio,r.h*ratio,(380-r.w*scale)/2,(230-r.h*scale)/2,r.w*scale,r.h*scale);return true;}const ratio=H.renderer.getPixelRatio(),size=rx*1.65;c.drawImage(H.renderer.domElement,(this.plate.x-size/2)*ratio,(this.plate.y-size/2)*ratio,size*ratio,size*ratio,60,-5,260,260);return true;}
}
