const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
// A short gesture releases one ballistic throw. Slow tilting only aims.
export class Serving {
  constructor(){this.state='view';this.age=0;this.aim=0;this.neutral=null;this.sample=null;this.cooldown=0;this.attempts=0;this.position={x:0,y:-.7,z:.16};this.rotation=0;this.power=1;}
  tilt(g,now){if(this.state!=='ready'){this.sample=null;return false;}if(!Number.isFinite(g.x)||!Number.isFinite(g.y)||!Number.isFinite(now))return false;
    if(!this.neutral)this.neutral={...g};this.aim=clamp((g.x-this.neutral.x)*2,-.85,.85);
    const old=this.sample;this.sample={...g,t:now};if(!old)return false;const dt=(now-old.t)/1000;if(dt<.008||dt>.16)return false;const speed=Math.abs(g.y-old.y)/dt;
    if(this.age>.55&&speed>1.45&&Math.abs(g.y-old.y)>.026)return this.launch(clamp(.87+(speed-1.45)*.055,.87,1.2));return false;
  }
  acceleration(a){if(this.state!=='ready'||this.age<.55||!a)return false;const magnitude=Math.hypot(a.x||0,a.y||0,a.z||0);if(magnitude>3.6&&magnitude<35)return this.launch(clamp(.88+(magnitude-3.6)*.028,.88,1.22));return false;}
  launch(power=1){if(this.state!=='ready')return false;this.state='flying';this.age=0;this.power=power;this.attempts++;this.position={x:0,y:-.7,z:.16};this.velocity={x:this.aim*.8,y:3.35*power,z:4.55};this.rotation=0;return true;}
  update(dt){this.age+=dt;if(this.state==='view'&&this.age>=1.35){this.state='ready';this.age=0;}
    if(this.state==='flying'){const t=this.age;this.position={x:this.velocity.x*t,y:-.7+this.velocity.y*t,z:.16+this.velocity.z*t-4*t*t};this.rotation=Math.sin(Math.min(t/.95,1)*Math.PI)*.5;
      if(this.velocity.z-8*t<0&&this.position.z<=.95){const landT=(4.55+Math.sqrt(4.55**2-16*(.95-.16)))/8;const x=this.velocity.x*landT,y=-.7+this.velocity.y*landT;const hit=(x/.58)**2+((y-2.3)/.60)**2<1;this.state=hit?'landed':'miss';this.age=0;this.position={x,y,z:.95};this.rotation=0;}
    }else if(this.state==='miss'){this.position.z-=dt*2.3;if(this.age>1){this.state='ready';this.age=0;this.sample=null;this.neutral=null;this.position={x:0,y:-.7,z:.16};}}
    return this.state==='landed'&&this.age>.85;
  }
}
