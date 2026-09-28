import {voiceAssets} from './voice-assets.177407933d65.mjs';
// Original 16-bar, 96 BPM kitchen tune and synthesized cooking Foley.
// Human vocal recordings: see assets/voices/SOURCES.md.
const beat=60/96;
const melody=[
 [76,79,81,79,76,74,72,0],[74,76,79,0,76,74,72,0],
 [72,76,79,81,79,76,74,0],[74,77,81,79,77,74,72,0],
 [76,79,84,0,83,81,79,76],[77,81,79,77,76,74,72,0],
 [74,76,79,76,74,72,71,0],[72,0,76,79,72,0,0,0],
 [79,81,84,81,79,76,74,0],[76,79,81,0,79,76,74,0],
 [77,81,84,81,79,77,76,0],[74,77,79,77,76,74,71,0],
 [76,79,81,79,76,74,72,76],[77,81,79,77,76,74,72,0],
 [74,76,79,0,77,74,71,0],[72,76,79,84,72,0,0,0]
];
const chords=[[48,52,55],[45,48,52],[53,57,60],[43,47,50]];
export class KitchenSound {
  constructor(){this.ctx=null;this.muted=false;this.step=0;this.started=false;this.next=0;this.lastSizzle=0;
    if(typeof document!=='undefined')document.addEventListener('visibilitychange',()=>{
      if(document.hidden){this.player?.pause();this.ctx?.suspend().catch(()=>{});}else this.resume();
    });
  }
  startMusic(){if(typeof Audio==='undefined')return;if(!this.player){this.player=new Audio(new URL('./assets/music.077e4241d983.wav',import.meta.url).href);this.player.loop=true;this.player.preload='auto';}this.player.muted=this.muted;this.player.volume=this.ducked?.055:.16;if(this.muted||globalThis.document?.hidden||this.playPending||!this.player.paused)return;this.playPending=true;this.player.play().then(()=>{this.musicError=null;}).catch(e=>{this.musicError=e;}).finally(()=>{this.playPending=false;});}
  start(){
    this.startMusic();
    if(this.ctx){this.resume();return;}
    const AC=globalThis.AudioContext||globalThis.webkitAudioContext;if(!AC)return;
    try{
      this.ctx=new AC();const c=this.ctx;this.master=c.createGain();this.master.gain.value=this.muted?0:.65;
      const compressor=c.createDynamicsCompressor();compressor.threshold.value=-16;compressor.ratio.value=4;
      this.master.connect(compressor);compressor.connect(c.destination);
      this.music=c.createGain();this.music.gain.value=.55;this.music.connect(this.master);
      this.fx=c.createGain();this.fx.gain.value=.6;this.fx.connect(this.master);
      this.noise=c.createBuffer(1,c.sampleRate*2,c.sampleRate);const d=this.noise.getChannelData(0);
      for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
      const source=c.createBufferSource();source.buffer=this.noise;source.loop=true;
      const filter=c.createBiquadFilter();filter.type='highpass';filter.frequency.value=1500;
      this.sizzle=c.createGain();this.sizzle.gain.value=0;source.connect(filter);filter.connect(this.sizzle);this.sizzle.connect(this.fx);source.start();
      this.voices=c.createGain();this.voices.gain.value=.72;this.voices.connect(compressor);this.preloadVoices();this.started=true;this.next=c.currentTime+.08;this.resume();
      // Native media element owns background music; Web Audio remains for effects.
    }catch{this.ctx=null;this.started=false;}
  }
  resume(){this.startMusic();if(this.ctx&&this.ctx.state!=='running')return this.ctx.resume().catch(()=>{});}
  // Guest heat never changes music volume. Keep the legacy callback harmless.
  setDucked(){this.ducked=false;if(this.player)this.player.volume=.16;if(this.ctx&&this.master)this.master.gain.setTargetAtTime(this.muted?0:.65,this.ctx.currentTime,.1);}
  preloadVoices(){if(this.voiceLoads||!this.ctx)return;this.voiceLoads=Object.fromEntries(Object.entries(voiceAssets).map(([key,url])=>[key,fetch(new URL(url,import.meta.url)).then(r=>{if(!r.ok)throw Error('voice '+r.status);return r.arrayBuffer();}).then(b=>this.ctx.decodeAudioData(b)).catch(()=>null)]));}
  async reaction(kind,{priority=false}={}){if(this.muted||!this.ctx)return false;this.preloadVoices();const request=this.voiceLoads[kind];if(!request)return false;const now=performance.now();if(!priority&&now<(this.nextVoice||0))return false;this.nextVoice=now+650;const buffer=await request;if(!buffer||this.muted||this.ctx.state!=='running')return false;
    return new Promise(resolve=>{const source=this.ctx.createBufferSource();source.buffer=buffer;source.connect(this.voices);source.onended=()=>{source.disconnect();resolve(true);};try{source.start();}catch{source.disconnect();resolve(false);}});
  }
  toggle(){if(this.musicError&&!this.muted){this.resume();return false;}this.muted=!this.muted;if(this.voices)this.voices.gain.value=this.muted?0:.72;if(this.player)this.player.muted=this.muted;if(!this.muted)this.resume();if(this.ctx)this.master.gain.setTargetAtTime(this.muted?0:this.ducked?.12:.65,this.ctx.currentTime,.04);return this.muted;}
  tone(note,time,duration=.28,volume=.10,type='triangle',bus=this.music){
    if(!this.ctx||!note)return;const c=this.ctx,o=c.createOscillator(),g=c.createGain();
    o.type=type;o.frequency.value=440*2**((note-69)/12);
    g.gain.setValueAtTime(0,time);g.gain.linearRampToValueAtTime(volume,time+.008);g.gain.exponentialRampToValueAtTime(.0001,time+duration);
    o.connect(g);g.connect(bus);o.start(time);o.stop(time+duration+.02);o.onended=()=>{o.disconnect();g.disconnect();};
  }
  hiss(time,duration,volume,frequency=1000){
    if(!this.ctx)return;const c=this.ctx,s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();
    s.buffer=this.noise;f.type='bandpass';f.frequency.value=frequency;f.Q.value=.7;
    g.gain.setValueAtTime(0,time);g.gain.linearRampToValueAtTime(volume,time+.04);g.gain.exponentialRampToValueAtTime(.0001,time+duration);
    s.connect(f);f.connect(g);g.connect(this.fx);s.start(time);s.stop(time+duration);s.onended=()=>{s.disconnect();f.disconnect();g.disconnect();};
  }
  schedule(){
    const c=this.ctx;if(!c||c.state!=='running')return;
    if(this.next<c.currentTime)this.next=c.currentTime+.04;
    while(this.next<c.currentTime+.18){
      const bar=Math.floor(this.step/8)%16,k=this.step%8,chord=chords[bar%4],t=this.next;
      this.tone(melody[bar][k],t,.3,.105);
      if(k%2===0)this.tone(chord[k===0?0:2],t,.46,.085,'sine');
      if(k===2||k===6)for(const n of chord)this.tone(n+12,t,.17,.027,'triangle');
      if(k%2===1)this.hiss(t,.06,.013,3400);
      this.step++;this.next+=beat/2;
    }
  }
  cooking(active,heat){if(!this.ctx)return;const t=this.ctx.currentTime;if(t-this.lastSizzle<.1)return;this.lastSizzle=t;this.sizzle.gain.setTargetAtTime(active&&heat>0?.008*heat:0,t,.15);}
  pour(){if(!this.ctx)return;const t=this.ctx.currentTime;this.hiss(t,.65,.19,550);this.hiss(t+.15,.95,.075,2400);for(let i=0;i<4;i++)this.tone(51+i*3,t+i*.12,.11,.045,'sine',this.fx);}
  burn(){if(!this.ctx)return;const t=this.ctx.currentTime;this.hiss(t,.55,.13,3500);this.tone(75,t+.1,.14,.08,'triangle',this.fx);this.tone(70,t+.26,.22,.06,'triangle',this.fx);}
  catchPlate(){if(!this.ctx)return;const t=this.ctx.currentTime;this.tone(84,t,.22,.1,'sine',this.fx);this.hiss(t,.1,.065,900);}
  sprinkle(){if(!this.ctx)return;const t=this.ctx.currentTime;for(let i=0;i<5;i++)this.hiss(t+i*.055,.09,.05,1700+i*230);}
  crunch(){if(!this.ctx)return;const t=this.ctx.currentTime;this.hiss(t,.13,.14,2800);this.hiss(t+.09,.09,.09,1400);}
  brush(){if(!this.ctx)return;const t=this.ctx.currentTime;if(t-(this.lastBrush||0)<.2)return;this.lastBrush=t;this.hiss(t,.23,.055,650);}
  serve(kind){if(!this.ctx)return;const t=this.ctx.currentTime;this.tone(88,t,.15,.10,'sine',this.fx);this.tone(95,t+.015,.11,.035,'sine',this.fx);
    const notes={good:[72,76,79,84],raw:[76,74,69],burnt:[72,71,66,64],mixed:[72,66,71,64],odd:[72,79,74,81]}[kind]||[72,76,79,84];
    notes.forEach((n,i)=>this.tone(n,t+.3+i*.16,i===notes.length-1?.45:.2,.11,'triangle',this.fx));
  }
}
