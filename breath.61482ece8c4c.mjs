// Optional onset count for input diagnostics; cooling uses sustained active input.
export class PuffCounter {
 constructor(){this.reset();}
 reset(){this.count=0;this.on=0;this.off=.3;this.latched=false;}
 update(active,dt){dt=Math.min(Math.max(dt,0),.1);if(active){if(!this.latched){this.on+=dt;if(this.on>=.18&&this.off>=.22){this.count=this.count+1;this.latched=true;this.off=0;}}}else{this.on=0;this.off+=dt;if(this.off>=.22)this.latched=false;}return this.count;}
}
// Detection threshold is only a sound/no-sound gate; puff strength never affects scoring.
export class BreathGate {
 constructor(){this.counter=new PuffCounter();this.floor=.001;this.age=0;this.active=false;this.silent=0;this.samples=[];this.calibrating=true;this.threshold=.0025;}
 update(level,dt){this.age+=dt;this.silent=level<.00001?this.silent+dt:0;
  if(this.calibrating){this.samples.push(level);if(this.age<.65)return 0;const values=this.samples.sort((a,b)=>a-b);this.floor=Math.max(.00005,values[Math.floor(values.length*.25)]||0);this.calibrating=false;}
  this.threshold=Math.max(.0004,this.floor*1.6+.00015);const end=Math.max(.0002,this.floor*1.25+.00008);
  this.active=level>(this.active?end:this.threshold);
  if(!this.active)this.floor=Math.max(.00005,this.floor+(level-this.floor)*Math.min(1,dt*.8));
  return this.counter.update(this.active,dt);
 }
}
const resumeContext=async ctx=>{
 if(ctx.state==='running')return;
 let timer;try{await Promise.race([ctx.resume(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('audio resume timed out')),1800);})]);}finally{clearTimeout(timer);}
 if(ctx.state!=='running')throw Error('audio not running');
};
export class BreathInput {
 constructor({getContext}={}){this.getContext=getContext;this.gate=new BreathGate();this.counter=this.gate.counter;this.running=false;this.level=0;this.pending=false;this.generation=0;this.status='';}
 get usable(){return !!(this.running&&this.context?.state==='running'&&this.track?.readyState==='live'&&!this.track.muted);}
 pause(){this.cooling=false;this.counter.reset();this.gate.active=false;}
 async resume(){if(this.context)await resumeContext(this.context);}
 async start(){if(this.running||this.pending)return;this.pending=true;const generation=++this.generation;this.gate=new BreathGate();this.counter=this.gate.counter;this.status='正在连接麦克风…';
  const shared=this.getContext?.();const ctx=shared||new (window.AudioContext||window.webkitAudioContext)();this.context=ctx;this.ownsContext=!shared;
  // Start both requests inside the player's gesture, then resume again after permission.
  const initialResume=ctx.resume().catch(()=>{});
  try{const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:{ideal:true},noiseSuppression:{ideal:false},autoGainControl:{ideal:false}},video:false});
   if(generation!==this.generation){stream.getTracks().forEach(t=>t.stop());return;}
   this.stream=stream;await resumeContext(ctx);
   if(generation!==this.generation){stream.getTracks().forEach(t=>t.stop());return;}
   this.track=stream.getAudioTracks()[0];this.source=ctx.createMediaStreamSource(stream);this.analyser=ctx.createAnalyser();this.analyser.fftSize=1024;
   this.source.connect(this.analyser);this.silentOutput=ctx.createGain();this.silentOutput.gain.value=0;this.analyser.connect(this.silentOutput);this.silentOutput.connect(ctx.destination);
   this.buffer=new Float32Array(1024);this.running=true;this.pending=false;this.level=0;this.settings=this.track?.getSettings?.()||{};this.status='先安静半秒，听听周围的声音。';
  }catch(e){if(generation===this.generation){this.stop();this.status='麦克风没有连上，可以点按钮重连。';}throw e;}
 }
 update(dt){this.cooling=false;if(!this.running)return this.counter.count;
  this.resumeRetry=Math.max(0,(this.resumeRetry||0)-dt);
  if(this.context?.state!=='running'&&this.context?.state!=='closed'&&!this.resumePending&&!this.resumeRetry){
   const generation=this.generation;this.resumeRetry=1;
   this.resumePending=this.resume().then(()=>{if(generation===this.generation)this.pause();}).catch(()=>{}).finally(()=>{this.resumePending=null;});
   this.status='麦克风暂停了，正在恢复…';return this.counter.count;
  }
  if(this.context?.state!=='running'||this.track?.readyState==='ended'||this.track?.muted){this.status='麦克风暂停了，请点「重新连接麦克风」。';return this.counter.count;}
  this.analyser.getFloatTimeDomainData(this.buffer);let mean=0,sum=0;for(const x of this.buffer)mean+=x;mean/=this.buffer.length;for(const x of this.buffer)sum+=(x-mean)**2;this.level=Math.sqrt(sum/this.buffer.length);
  const count=this.gate.update(this.level,dt);this.cooling=!this.gate.calibrating&&this.gate.active&&this.counter.on>=.10;this.signal=Math.min(1,this.level/Math.max(.0006,this.gate.threshold));
  this.status=this.gate.calibrating?'先安静半秒，听听周围的声音。':this.gate.silent>2?'暂未收到声音，请靠近手机麦克风试试。':this.gate.active?(this.cooling?'正在降温，红色慢慢退下去啦。':'收到声音了…'):'对着麦克风吹气，帮它凉快一下。';return count;
 }
 stop(){this.generation++;this.running=false;this.pending=false;this.stream?.getTracks().forEach(t=>t.stop());this.stream=null;this.track=null;this.source?.disconnect();this.analyser?.disconnect();this.silentOutput?.disconnect();if(this.ownsContext)this.context?.close().catch(()=>{});this.context=null;this.source=null;this.analyser=null;this.silentOutput=null;this.status='';this.signal=0;this.cooling=false;}
}
