export function foldedPoint(x,y,p,fill=.045){
  const edge=.70,side=x<-edge?0:x>edge?1:-1;let z=.028;
  if(side>=0){const pivot=side?edge:-edge,d=x-pivot,a=p[side]*Math.PI;x=pivot+d*Math.cos(a);z+=Math.abs(d)*Math.sin(a)+p[side]*(fill+(side?.018:0));}
  const roll=p[2],front=-1+2*roll,r=.27+fill*.12;
  if(y<front){const arc=(front-y)/r,layer=.006*arc/(Math.PI*2);y=front-(r+layer)*Math.sin(arc);z+=(.052+fill*.18+layer)*(1-Math.cos(arc));}
  if(roll>.85)y-=(roll-.85)/.15;
  return [x,y,z];
}
