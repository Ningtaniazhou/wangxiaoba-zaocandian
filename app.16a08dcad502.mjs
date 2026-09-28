import {installTouchGuard} from './touch-guard.547686805f34.mjs';
import {OpeningTour,prepareOpening} from './opening.eaf0af4bc33b.mjs';
import {Hospitality,learned,learn} from './hospitality.0bced1e4c9b0.mjs';
import { Assembly } from './assembly.cfaddaa6db7d.mjs';
import { CalibrationGate, pointerInGame, panLayout } from './controls.58865d14af16.mjs';
import { KitchenSound } from './sound.519b577f30af.mjs';
import { batterColor } from './appearance.9f7265756857.mjs';
import { Batter } from './simulation.cb9bbfbbf576.mjs?v=3';
import { gravityOnScreen, resolveScreenAngle } from './motion.ecb4394f6fb3.mjs';
const $=id=>document.getElementById(id), canvas=$('scene'),ctx=canvas.getContext('2d');
installTouchGuard($('kitchen'));
let sim=new Batter(), state='ready',w=0,h=0,dpr=1,px=0,py=0,rx=0,ry=0,tx=0,ty=0,targetX=0,targetY=0,sensitivity=1,heat=1,last=0,mode='touch',pointer=null,orientation=null,baseline=null,hasReading=false,motionPending=false,pouring=0,settingsOpen=false,physicsDebt=0;
const sound=new KitchenSound();
let assembly=null,hospitality=null;const opening=new OpeningTour();const tourFrame=document.createElement('canvas');tourFrame.id='tourFrame';tourFrame.className='hidden';$('kitchen').append(tourFrame);
const heatLevels=[0,.5,1,1.7],heatNames=["关火","小火","中火","大火"];
let lastHeat=1,burnSoundPlayed=false;
const calibration=new CalibrationGate();
let lastReadingAt=-Infinity,heldAngle=null,viewRotation=0,resumeNeedsLandscape=false,lockPending=false,lockAttempted=false;
const texture=document.createElement('canvas');texture.width=texture.height=sim.n;const tc=texture.getContext('2d');
const kitchenImage=new Image();kitchenImage.src='./assets/kitchen.6c7571097c2e.png';
const stoveImage=new Image();stoveImage.src='./assets/stove.f379e60ff6a4.png';
const ladleImage=new Image();ladleImage.src='./assets/ladle.42abe1f9b3cc.png';
const gripImage=new Image();gripImage.src='./assets/grip.620d83337276.png?v=4';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function ellipse(c,x,y,a,b,fill){c.beginPath();c.ellipse(x,y,a,b,0,0,Math.PI*2);c.fillStyle=fill;c.fill();}
function round(c,x,y,a,b,r,fill){c.beginPath();c.roundRect(x,y,a,b,r);c.fillStyle=fill;c.fill();}
function gradient(c,x,y,a,b,stops){const g=c.createLinearGradient(x,y,a,b);for(const [at,col] of stops)g.addColorStop(at,col);return g;}
function nativeScreenAngle(){const angle=resolveScreenAngle(screen.orientation?.angle,window.orientation,innerWidth>innerHeight);return innerWidth>innerHeight&&Math.abs(angle%180)!==90?(heldAngle??90):angle;}
function resize(){
  const landscape=innerWidth>innerHeight;
  if(landscape&&$('intro').classList.contains('hidden')&&heldAngle===null)heldAngle=nativeScreenAngle();
  if(landscape&&heldAngle!==null)heldAngle=nativeScreenAngle();
  viewRotation=!landscape&&heldAngle!==null?(heldAngle===270?-90:heldAngle):0;
  w=viewRotation?innerHeight:innerWidth;h=viewRotation?innerWidth:innerHeight;
  Object.assign($('kitchen').style,{width:`${w}px`,height:`${h}px`,transform:`translate(-50%,-50%) rotate(${viewRotation}deg)`});
  $('kitchen').classList.toggle('landscape-held',heldAngle!==null);
  $('kitchen').style.setProperty('--game-height',`${h}px`);
  dpr=Math.min(devicePixelRatio||1,2);canvas.width=w*dpr;canvas.height=h*dpr;
  const layout=panLayout(w,h);px=layout.x;py=layout.y;rx=ry=layout.radius;
  const size=Math.max(44,rx*.40);Object.assign($('stoveKnob').style,{left:`${px-size/2}px`,top:`${py+rx/2.4*3.03-size/2}px`,width:`${size}px`,height:`${size}px`});
  assembly?.resize();hospitality?.resize();
  if(landscape&&!document.hidden&&resumeNeedsLandscape){resumeNeedsLandscape=false;}
}
addEventListener('resize',()=>{const before=heldAngle;resize();if(mode==='motion'&&heldAngle!==before)beginCalibration();if(innerWidth>innerHeight)tryLandscapeLock();});resize();
function holdLandscape(){if(innerWidth>innerHeight)heldAngle=nativeScreenAngle();resize();tryLandscapeLock();}
async function tryLandscapeLock(){
  if(lockPending||lockAttempted||heldAngle===null||document.hidden||innerWidth<=innerHeight)return;
  if(typeof screen.orientation?.lock!=='function')return;
  lockPending=true;lockAttempted=true;
  try{await screen.orientation.lock('landscape');}catch{/* Keep the game landscape without claiming a system lock. */}finally{lockPending=false;}
}
function renderBatter(c,cx,cy,a,b){const n=sim.n,data=tc.createImageData(n,n);for(let i=0;i<sim.h.length;i++){const thick=sim.h[i];if(thick<.006)continue;const cook=sim.getCook(i),burn=sim.brown[i];const x=i%n,y=Math.floor(i/n);const grain=(Math.sin(x*91.7+y*37.1)*43758.5453)%1;const speck=(Math.sin(x*1.7)*Math.sin(y*2.3)+1)*.5;const color=batterColor(cook,burn,speck,thick);const k=i*4;data.data[k]=color[0]+grain*2;data.data[k+1]=color[1]+grain*2;data.data[k+2]=color[2]+grain*2;data.data[k+3]=clamp((thick-.006)/.016,0,1)*255;}tc.putImageData(data,0,0);c.save();c.imageSmoothingEnabled=true;c.shadowColor='#100e0970';c.shadowBlur=3;c.shadowOffsetY=2;c.drawImage(texture,cx-a,cy-b,a*2,b*2);c.shadowBlur=0;c.shadowOffsetY=0;
  // Small surface bubbles anchored to actual occupied cells.
  for(let k=0;k<100;k++){const ix=(k*31+13)%n,iy=(k*47+9)%n,i=iy*n+ix;if(sim.h[i]<.06)continue;let cook=sim.getCook(i);if(cook<.18||cook>.98)continue;const pulse=(Math.sin(sim.time*1.8+k*7)+1)*.5;let xx=cx+(ix/n*2-1)*a,yy=cy+(iy/n*2-1)*b;ellipse(c,xx,yy,1.1+pulse*1.6,(1.1+pulse)*b/a,cook<.92?'#fff5cf7a':'#9e713047');}c.restore();}
function draw(now){ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);if(hospitality?.active){ctx.fillStyle='#eadbc1';ctx.fillRect(0,0,w,h);hospitality.render();return;}if(assembly?.serving){ctx.fillStyle='#e4c693';ctx.fillRect(0,0,w,h);assembly.draw3D(1/60,0,0);return;}
  if(kitchenImage.complete&&kitchenImage.naturalWidth){const scale=Math.max(w/kitchenImage.naturalWidth,h/kitchenImage.naturalHeight),iw=kitchenImage.naturalWidth*scale,ih=kitchenImage.naturalHeight*scale;ctx.drawImage(kitchenImage,(w-iw)/2,(h-ih)/2,iw,ih);}
  assembly?.drawUnder(ctx);
  const unit=rx/2.4;
  if(stoveImage.complete&&stoveImage.naturalWidth)ctx.drawImage(stoveImage,px-unit*4,py-unit*4.5,unit*8,unit*9);
  drawFire(now);drawKnob(unit);
  ctx.save();ctx.translate(px+tx*5,py+ty*4);ctx.rotate(tx*.024);const a=rx,b=ry*(1-ty*.035);
  ctx.shadowColor='#29271755';ctx.shadowBlur=24;ctx.shadowOffsetY=16;ellipse(ctx,0,5,a*1.035,b*1.045,'#353b34');ctx.shadowBlur=0;ctx.shadowOffsetY=0;ellipse(ctx,0,0,a*1.04,b*1.04,gradient(ctx,-a,-b,a,b,[[0,'#a5aa90'],[.2,'#697360'],[.65,'#3a443b'],[1,'#a4a78d']]));ellipse(ctx,0,-2,a*.987,b*.987,gradient(ctx,-a,-b,a,b,[[0,'#49544a'],[.48,'#333d35'],[1,'#252d27']]));ellipse(ctx,0,2,a*.91,b*.90,gradient(ctx,0,-b,0,b,[[0,'#303a32'],[1,'#424b3c']]));
  ctx.save();ctx.beginPath();ctx.ellipse(0,0,a*.94,b*.94,0,0,Math.PI*2);ctx.clip();for(let i=0;i<550;i++){const xx=Math.sin(i*127.1)*a,yy=Math.cos(i*311.7)*b;ctx.fillStyle=i%2?'#e5e1a507':'#0000000c';ctx.fillRect(xx,yy,1.3,1.3);}if(sim.poured&&!assembly?.foldStarted){renderBatter(ctx,0,0,a*.985,b*.985);assembly?.drawFood(ctx,0,0,a*.985,b*.985);}ctx.restore();
  if(pouring>0&&ladleImage.complete&&ladleImage.naturalWidth){
    const q=1-pouring,lx=a*.08,ly=-b*.24-Math.max(0,q-.75)*b;
    ctx.save();ctx.globalAlpha=Math.min(1,pouring*5);
    ctx.strokeStyle='#f2d79d';ctx.lineWidth=14*pouring;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(lx,ly+a*.145);ctx.quadraticCurveTo(a*.04,-b*.1,0,0);ctx.stroke();
    ctx.translate(lx,ly);ctx.rotate(-.65-.18*Math.sin(q*Math.PI));
    const width=a*2.2,height=width*.35;
    ctx.shadowColor='#171b2240';ctx.shadowBlur=5;ctx.shadowOffsetY=4;
    ctx.drawImage(ladleImage,-width*.1875,-height*.5,width,height);
    ctx.shadowBlur=0;ctx.shadowOffsetY=0;
    if(pouring>.18)ellipse(ctx,0,0,a*.184,a*.148,gradient(ctx,0,-a*.07,0,a*.07,[[0,'#fff0cd'],[1,'#e8c98d']]));
    ctx.restore();
  }
  if(state==='cooking'&&sim.time>7){ctx.lineWidth=2;for(let j=0;j<5;j++){const k=(now*.00022+j*.19)%1;ctx.strokeStyle=`rgba(255,251,224,${(1-k)*.17})`;ctx.beginPath();ctx.moveTo((j-2)*a*.16,-b*.2-k*b*.5);ctx.bezierCurveTo((j-2)*a*.16+10,-b*.3-k*b*.5,(j-2)*a*.16-12,-b*.45-k*b*.5,(j-2)*a*.16,-b*.55-k*b*.5);ctx.stroke();}}// Rendered Blender grip shares the pan transform, so hands never detach.
  if(!assembly?.hands?.ready&&gripImage.complete&&gripImage.naturalWidth){const span=rx*16/2.4,height=span/1.6;ctx.drawImage(gripImage,-span/2,-height/2,span,height);}
  ctx.restore();
  assembly?.draw3D(1/60,tx,ty);
}
function paused(){return calibration.pending||settingsOpen||!$('intro').classList.contains('hidden')||document.hidden||(heldAngle===null&&innerWidth<=innerHeight);}
function loop(now){updateCalibration(now);let dt=Math.min((now-last)/1000||0,.25);last=now;if(!paused()){const f=1-Math.exp(-dt*10);tx+=(targetX-tx)*f;ty+=(targetY-ty)*f;if(state==='cooking'){physicsDebt+=dt;while(physicsDebt>=1/60){sim.step(1/60,hospitality?.active?0:tx,hospitality?.active?0:ty,heat);physicsDebt-=1/60;}pouring=Math.max(0,pouring-dt*.9);updateHint();}if(state==='assembling')assembly?.update(dt);hospitality?.update(dt);updateOpening(dt);}else{physicsDebt=0;}$('hint').classList.toggle('hidden',opening.active||!!hospitality?.active||(!calibration.pending&&learned('pancake')));$('viewGuests').disabled=opening.active||calibration.pending||!$('intro').classList.contains('hidden')||(!!assembly?.foldStarted&&state!=='serving');$('kettleButton').disabled=$('viewGuests').disabled;draw(now);sound.cooking(state==='cooking'&&!paused(),heat);requestAnimationFrame(loop);}requestAnimationFrame(loop);
function updateHint(){const currentStats=sim.stats();if(currentStats.burnt>.08&&!burnSoundPlayed){sound.burn();burnSoundPlayed=true;}const ready=sim.time>5&&currentStats.undercookedArea<.12;if(heat===0){if(ready){$('hint').textContent='关火了，可以加料，也可以直接上菜。';return;}$('hint').textContent='饼皮还偏软，可以再煎一会儿。';return;}if(ready){$('hint').textContent='饼快熟了，准备关火刷酱。';return;}const t=sim.time;let text=t<4?'轻轻向四周倾斜，让面糊流开。':t<13?'慢慢绕圈倾斜，把面糊铺向空的地方。':t<25?'边缘开始凝固了，留意颜色和小气泡。':'留意饼面颜色，熟了就可以关火刷酱。';if(t>18){const stats=sim.stats();if(stats.burnt>.08&&!burnSoundPlayed){sound.burn();burnSoundPlayed=true;}if(stats.burnt>.08)text='闻到一点焦香了……关火刷酱吧。';}$('hint').textContent=text;}
function reset(){assembly?.reset();setHeat(1);burnSoundPlayed=false;physicsDebt=0;sim=new Batter();state='ready';pouring=0;$('result').classList.add('hidden');$('pourButton').disabled=false;$('serveButton').disabled=true;$('hint').textContent='准备好，端平你的小铁锅。';if(mode==='motion')beginCalibration();}
$('pourButton').onclick=()=>{if(opening.active||state!=='ready'||calibration.pending||paused())return;sound.start();sound.pour();sim.pour();state='cooking';pouring=1;$('pourButton').disabled=true;$('serveButton').disabled=false;};
function showResult(){state='served';const s=sim.stats();let title,comment;if(s.burnt>.23&&s.undercookedArea>.15){title='外焦里……还没熟';comment='外面已经下班，中间还没开工。下次试着摊薄一点。';}else if(s.burnt>.23){title='焦香，稍微超纲了';comment='它离锅巴只差一个正式的名字。下次早点出锅吧。';}else if(s.undercookedArea>.5){title='一张很有潜力的面糊';comment='造型已经有了，熟度还在路上。再给它一点时间。';}else if(s.undercookedArea>.15){title='这张饼，有点夹生';comment='薄的地方先熟了，厚的地方还在赖床。';}else if(s.roundness<.62){title='这轮廓，自由发挥';comment='形状很有自己的想法，倒也不耽误它是一张饼。';}else{title='今天，手感不错';comment='金黄里带一点不规则，这就是亲手做的证据。';}sound.serve(s.burnt>.23?(s.undercookedArea>.15?'mixed':'burnt'):s.undercookedArea>.15?'raw':s.roundness<.62?'odd':'good');$('resultTitle').textContent=title;$('resultComment').textContent=comment;$('resultStats').replaceChildren(...[`用时 ${Math.round(s.time)} 秒`,`未熟面积 ${Math.round(s.undercookedArea*100)}%`,`焦化面积 ${Math.round(s.burnt*100)}%`].map(t=>{const e=document.createElement('span');e.textContent=t;return e;}));const pc=$('plate').getContext('2d');pc.clearRect(0,0,380,230);pc.shadowColor='#6d694027';pc.shadowBlur=12;pc.shadowOffsetY=9;ellipse(pc,190,119,172,96,'#e6e6ce');pc.shadowBlur=0;pc.shadowOffsetY=0;ellipse(pc,190,114,168,94,'#fffef2');ellipse(pc,190,115,143,76,'#efeedc');if(!assembly?.resultPlate(pc))renderBatter(pc,190,110,142,82);if(assembly?.active){const flavors=[`上菜 ${assembly.serving?.attempts||1} 次`,`蘸酱 ${assembly.sauce.dips} 次`,assembly.recipe.scallions?`葱花 ${assembly.recipe.scallions} 撮`:'不加葱花',assembly.recipe.cilantro?`香菜 ${assembly.recipe.cilantro} 撮`:'不加香菜'];for(const text of flavors){const item=document.createElement('span');item.textContent=text;$('resultStats').append(item);}}$('result').classList.remove('hidden');}
$('serveButton').onclick=()=>{if(state==='cooking')assembly?.start();};$('againButton').onclick=reset;
function setHeat(value){
  if(assembly?.active&&value!==0)return;
  const index=heatLevels.indexOf(value);heat=value;if(value>0)lastHeat=value;
  $('heat').value=String(index);$('heat').setAttribute('aria-valuetext',heatNames[index]);
  document.querySelectorAll('.heat-labels span').forEach((el,i)=>el.classList.toggle('selected',i===index));
  $('stoveKnob').setAttribute('aria-label',value>0?'关闭炉火':'点燃炉火');
}
$('heat').oninput=e=>setHeat(heatLevels[+e.target.value]);
$('stoveKnob').onclick=()=>setHeat(heat>0?0:lastHeat);
$('soundButton').onclick=()=>{sound.start();const muted=sound.toggle();$('soundButton').textContent='♫';$('soundButton').classList.toggle('muted',muted);$('soundButton').setAttribute('aria-label',muted?'开启音乐和音效':'关闭音乐和音效');$('soundButton').setAttribute('aria-pressed',String(muted));};
document.addEventListener('pointerdown',()=>{if(sound.started)sound.resume();},{passive:true});
canvas.addEventListener('pointerdown',e=>{if(e.isPrimary===false)return;if(opening.active||paused()||(state==='served'&&!hospitality?.active))return;const point=pointerInGame(e.clientX,e.clientY,innerWidth,innerHeight,w,h,viewRotation);if(hospitality?.active){hospitality.down(point,e);canvas.setPointerCapture(e.pointerId);return;}if(assembly?.active){assembly.inputDown(point,e);canvas.setPointerCapture(e.pointerId);return;}if(mode!=='touch')return;pointer={id:e.pointerId,...pointerInGame(e.clientX,e.clientY,innerWidth,innerHeight,w,h,viewRotation)};canvas.setPointerCapture(e.pointerId);});canvas.addEventListener('pointermove',e=>{if(hospitality?.active){hospitality.move(pointerInGame(e.clientX,e.clientY,innerWidth,innerHeight,w,h,viewRotation),e);return;}if(assembly?.active){assembly.inputMove(pointerInGame(e.clientX,e.clientY,innerWidth,innerHeight,w,h,viewRotation),e);return;}if(!pointer||pointer.id!==e.pointerId)return;const point=pointerInGame(e.clientX,e.clientY,innerWidth,innerHeight,w,h,viewRotation);targetX=clamp((point.x-pointer.x)/90*sensitivity,-1,1);targetY=clamp((point.y-pointer.y)/90*sensitivity,-1,1);});const release=e=>{if(e?.isPrimary===false)return;hospitality?.up();assembly?.inputUp();pointer=null;if(mode==='touch')targetX=targetY=0;};canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('lostpointercapture',release);
function screenAngle(){return heldAngle!==null?heldAngle:nativeScreenAngle();}
function gravity(beta,gamma){return gravityOnScreen(beta,gamma,screenAngle());}
function updateModeSettings(){
  $('calibrateButton').classList.toggle('hidden',mode!=='motion');
  $('enableMotion').classList.toggle('hidden',mode==='motion');
  $('modeHelp').textContent=mode==='motion'?'倾斜手机来摊饼。拿稳后可以重新校准。':'按住锅面拖动来摊饼。也可以切换为手机体感。';
}
function beginCalibration(){
  if(mode!=='motion'||opening.active||assembly?.active||hospitality?.active)return;
  baseline=null;targetX=targetY=tx=ty=0;calibration.begin();$('pourButton').disabled=true;
  $('hint').textContent='准备好，端平你的小铁锅。';
  $('sensorInfo').textContent='返回锅面后，端稳一秒即可完成校准。';
}
function updateCalibration(now){
  if(!calibration.pending)return;
  const visible=!opening.active&&!document.hidden&&!settingsOpen&&$('intro').classList.contains('hidden')&&heldAngle!==null&&!resumeNeedsLandscape;
  if(visible)$('hint').textContent=calibration.since!==null&&now-calibration.since>1500&&now-lastReadingAt>300?'请端稳手机，正在校准。':'准备好，端平你的小铁锅。';
  if(calibration.tick(now,visible,lastReadingAt)){
    baseline=gravity(orientation.beta,orientation.gamma);targetX=targetY=tx=ty=0;
    $('pourButton').disabled=state!=='ready';$('hint').textContent=state==='ready'?'校准好了，可以倒面糊了。':'校准好了，继续摊你的煎饼。';
    $('sensorInfo').textContent='水平基准已更新。';
  }
}
addEventListener('deviceorientation',e=>{
  if(!Number.isFinite(e.beta)||!Number.isFinite(e.gamma))return;
  orientation={beta:e.beta,gamma:e.gamma};hasReading=true;lastReadingAt=performance.now();
  if(mode==='motion'&&hospitality?.active&&!paused()){hospitality.tilt(gravity(e.beta,e.gamma),performance.now());return;}if(mode==='motion'&&assembly?.serving&&!paused()){assembly.serving.tilt(gravity(e.beta,e.gamma),performance.now());return;}if(mode!=='motion'||calibration.pending||!baseline||assembly?.active)return;
  const g=gravity(e.beta,e.gamma);targetX=clamp((g.x-baseline.x)*3.4*sensitivity,-1,1);targetY=clamp((g.y-baseline.y)*3.4*sensitivity,-1,1);
  if(Math.abs(targetX)<.035)targetX=0;if(Math.abs(targetY)<.035)targetY=0;
});
addEventListener('devicemotion',e=>{if(mode==='motion'&&hospitality?.active&&!paused()){hospitality.acceleration(e.acceleration);return;}if(mode==='motion'&&assembly?.serving&&!paused())assembly.serving.acceleration(e.acceleration);});
function resetOrientation(){const before=heldAngle;resize();if(mode==='motion'&&before!==heldAngle)beginCalibration();tryLandscapeLock();}
addEventListener('orientationchange',resetOrientation);screen.orientation?.addEventListener('change',resetOrientation);
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){hospitality?.stopInput({releaseMicrophone:true});assembly?.inputUp();if(mode==='motion'){resumeNeedsLandscape=true;beginCalibration();}lockAttempted=false;}
  else{resize();tryLandscapeLock();hospitality?.resumeInput();}
});
addEventListener('pageshow',e=>{if(e.persisted&&mode==='motion'){resumeNeedsLandscape=innerWidth<=innerHeight;beginCalibration();resize();}});
async function enableMotion(){if(motionPending)return false;motionPending=true;const report=t=>{$('sensorInfo').textContent=t;};try{if(!isSecureContext){report('iPhone 体感需要 HTTPS 安全链接。当前可先用手指试玩。');return false;}if(typeof DeviceOrientationEvent==='undefined'){report('这台设备暂不支持体感，请用手指或鼠标试玩。');return false;}let motionPermission=null;const orientationPermission=typeof DeviceOrientationEvent.requestPermission==='function'?DeviceOrientationEvent.requestPermission():Promise.resolve('granted');if(typeof DeviceMotionEvent!=='undefined'&&typeof DeviceMotionEvent.requestPermission==='function')motionPermission=DeviceMotionEvent.requestPermission().catch(()=> 'denied');if(motionPermission)motionPermission.then(()=>{});if(typeof DeviceOrientationEvent.requestPermission==='function'){const answer=await orientationPermission;if(answer!=='granted'){report('未获得运动权限。可以先用手指试玩，再到浏览器设置中检查权限。');return false;}}hasReading=false;report('请端稳手机……');await new Promise(resolve=>{const start=performance.now();function check(){if(hasReading||performance.now()-start>2200)resolve();else setTimeout(check,70);}check();});if(!hasReading){report('体感暂未连接，请用 Safari 重试，或先用手指试玩。');return false;}mode='motion';beginCalibration();updateModeSettings();report('体感已连接，返回锅面后端稳一秒。');return true;}catch{report('体感暂不可用，请检查运动权限，或先用手指试玩。');return false;}finally{motionPending=false;}}
$('motionStart').onclick=async()=>{const button=$('motionStart');if(button.disabled)return;button.disabled=true;const enabled=await prepareOpening({sound,requestMotion:enableMotion,requestMicrophone:()=>hospitality.prepareMicrophone()});if(!enabled){mode='touch';calibration.cancel();updateModeSettings();}$('intro').classList.add('hidden');startOpening();holdLandscape();button.disabled=false;};
$('settingsButton').onclick=()=>{hospitality?.stopInput();assembly?.inputUp();settingsOpen=true;updateModeSettings();$('settings').classList.remove('hidden');};
$('closeSettings').onclick=()=>{settingsOpen=false;$('settings').classList.add('hidden');hospitality?.resumeInput();};
$('sensitivity').oninput=e=>{sensitivity=+e.target.value;$('sensitivityValue').textContent=sensitivity.toFixed(1)+'×';};
$('calibrateButton').onclick=()=>{settingsOpen=false;$('settings').classList.add('hidden');beginCalibration();};
$('enableMotion').onclick=async()=>{if(await enableMotion()){settingsOpen=false;$('settings').classList.add('hidden');holdLandscape();}};
updateModeSettings();

function drawFire(now){
  if(heat<=0)return;
  ctx.save();ctx.translate(px,py);
  for(let j=0;j<23;j++){
    const angle=Math.PI*(.08+j*.84/22),pulse=.9+.1*Math.sin(now*.007+j*1.7);
    ctx.save();ctx.translate(Math.cos(angle)*rx*1.025,Math.sin(angle)*ry*1.025);ctx.rotate(angle+Math.PI/2);
    const length=rx*(.065+heat*.05)*pulse,width=rx*.025;
    ctx.shadowColor='#209dff';ctx.shadowBlur=8;ctx.fillStyle=gradient(ctx,0,0,0,-length,[[0,'#2665ff'],[.5,'#37bbff'],[1,'#b5faff']]);
    ctx.beginPath();ctx.moveTo(-width,0);ctx.bezierCurveTo(-width,-length*.45,0,-length*.6,0,-length);ctx.bezierCurveTo(width*.35,-length*.6,width,-length*.35,width,0);ctx.closePath();ctx.fill();ctx.restore();
  }
  ctx.restore();
}
function drawKnob(unit){
  ctx.save();ctx.translate(px,py+unit*3.03);ctx.rotate(heat>0?-.55+heat*.72:-1.4);
  ctx.shadowColor='#4a3e283f';ctx.shadowBlur=3;ctx.shadowOffsetY=2;
  round(ctx,-unit*.095,-unit*.30,unit*.19,unit*.58,unit*.075,gradient(ctx,-unit*.1,0,unit*.1,0,[[0,'#c4b887'],[.5,'#fff2c7'],[1,'#e6d9ac']]));
  ctx.shadowBlur=0;ctx.shadowOffsetY=0;round(ctx,-unit*.024,-unit*.24,unit*.048,unit*.095,unit*.02,heat>0?'#7d9450':'#afa78b');ctx.restore();
}

assembly=new Assembly({get:()=>({sim,state,w,h,px,py,rx,ry,tx,ty}),onStart:()=>{state='assembling';calibration.cancel();setHeat(0);targetX=targetY=tx=ty=0;physicsDebt=0;pointer=null;},onServed:showResult,requestServe:requestServe,onReady:async()=>{await hospitality.promise;if(hospitality.ready){state='serving';hospitality.takeFood(assembly.hands);}},renderSkin:renderBatter,sound});

function requestServe(){if(opening.active||paused())return;if(state==='serving'&&!hospitality?.active){hospitality.open('throw');return;}if(!sim.poured||paused()||hospitality?.active||assembly?.busy||['serving','served'].includes(state))return;assembly?.serveNow();}
hospitality=new Hospitality({get:()=>({w,h,state}),hands:()=>assembly.hands,audioContext:()=>{sound.start();return sound.ctx;},leavePan:()=>{pointer=null;targetX=targetY=tx=ty=0;assembly.inputUp();},returnPan:()=>{targetX=targetY=tx=ty=0;if(state==='served')reset();},newPancake:reset,endShift:()=>{setHeat(0);assembly.reset();state='served';sim.poured=false;pointer=null;},celebrate:()=>{sound.serve('good');sound.reaction('cheer',{priority:true});},isSpicy:()=> (assembly.chili?.appliedDips||0)>=2,describeFood:()=>{const s=sim.stats();return s.burnt>.23?'burnt':s.undercookedArea>.2?'raw':!(assembly.recipe.scallions+assembly.recipe.cilantro)&&!assembly.recipe.crisp?'plain':null;},throwStarted:()=>sound.serve('good'),foodDelivered:result=>{state='served';sim.poured=false;assembly.reset();if(result.kind==='plate')sound.catchPlate?.();else sound.burn();},audioReady:()=>sound.resume(),soundDuck:duck=>sound.setDucked(duck),reaction:kind=>sound.reaction(kind)});

$('viewGuests').onclick=()=>{if(!opening.active&&!paused()&&(!assembly.foldStarted||state==='serving'))hospitality.open('view');};
$('kettleButton').onclick=()=>{if(!opening.active&&!paused()&&(!assembly.foldStarted||state==='serving'))hospitality.open('soy');};
$('replayTutorial').onclick=()=>{try{for(const key of ['pancake','soy','cooling'])localStorage.removeItem('jianbing.learned.'+key);}catch{}$('sensorInfo').textContent='教学已恢复，下次操作时会提示。';};

function startOpening(){opening.begin();calibration.cancel();$('pourButton').disabled=true;$('kitchen').classList.add('opening-tour');hospitality.open('tour').then(()=>{if(opening.active&&!hospitality.ready)finishOpening();});}
function updateOpening(dt){
 if(!opening.active)return;
 const event=opening.update(dt,!!hospitality?.ready&&!!assembly?.hands?.ready);
 if(assembly?.error||hospitality?.error){finishOpening();return;}
 if(event==='return'){
  hospitality.render();const renderer=assembly.hands.renderer;
  tourFrame.width=w*dpr;tourFrame.height=h*dpr;tourFrame.getContext('2d').drawImage(renderer.domElement,0,0,tourFrame.width,tourFrame.height);
  tourFrame.classList.remove('hidden');hospitality.close();
 }
 if(opening.phase==='return'){
  const p=opening.progress;tourFrame.style.transform=`translateY(${-p*100}%)`;tourFrame.style.opacity=String(1-Math.max(0,(p-.8)/.2));
  canvas.style.transform=$('handsScene').style.transform=`translateY(${(1-p)*100}%)`;
 }
 if(event==='done')finishOpening();
}
function finishOpening(){opening.finish();if(hospitality.active)hospitality.close();tourFrame.classList.add('hidden');tourFrame.style.transform='';tourFrame.style.opacity='';canvas.style.transform=$('handsScene').style.transform='';$('kitchen').classList.remove('opening-tour');$('hint').textContent='准备好，端平你的小铁锅。';if(mode==='motion')beginCalibration();else{$('pourButton').disabled=state!=='ready';$('hint').textContent='倒入面糊后，在锅面拖动来摊开。';}}

addEventListener('pointerdown',()=>sound.resume(),{passive:true});
