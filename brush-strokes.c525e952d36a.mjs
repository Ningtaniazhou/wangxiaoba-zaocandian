// Preserve gestures made while the brush travels from the bowl, including short taps.
export class BrushStrokes {
 constructor(){this.clear();}
 clear(){this.jobs=[];this.current=null;}
 begin(point,pressure=.6){this.current={points:[{...point}],pressure,closed:false,contact:false};this.jobs.push(this.current);}
 move(point){const job=this.current;if(!job)return;const last=job.points.at(-1);if(!last||Math.hypot(last.x-point.x,last.y-point.y)>.015)job.points.push({...point});}
 end(){if(this.current)this.current.closed=true;this.current=null;}
 step(cursor,dt,paint){cursor={...cursor};let budget=Math.min(dt,.1)*12,contact=false;
  while(this.jobs.length){const job=this.jobs[0],target=job.points[0],old={...cursor},d=Math.hypot(target.x-cursor.x,target.y-cursor.y),t=d?Math.min(1,budget/d):1;cursor={x:cursor.x+(target.x-cursor.x)*t,y:cursor.y+(target.y-cursor.y)*t,z:target.z};budget=Math.max(0,budget-d*t);
   if(job.contact){paint(old,cursor,job.pressure);contact=true;}
   if(t<1)break;
   if(!job.contact){job.contact=true;paint(cursor,cursor,job.pressure);contact=true;}
   if(job.points.length>1)job.points.shift();else if(job.closed)this.jobs.shift();else break;
   if(!budget)break;
  }
  return {cursor,contact:contact&&this.jobs.length>0};
 }
}
