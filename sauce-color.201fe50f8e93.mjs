// Composite both sauces into one immutable frame before sending it to canvas.
// A transparent chili layer must leave the sweet sauce completely unchanged.
export function saucePixels(sweet,chili,out){
  for(let i=0;i<sweet.h.length;i++){
    const amount=sweet.h[i],red=chili?.h[i]||0,x=i%sweet.n,y=Math.floor(i/sweet.n),grain=Math.sin(x*2.3+y*1.7)*3;
    const sa=amount<.0002?0:(1-Math.exp(-amount*42))*239/255;
    const ca=red<.0002?0:(1-Math.exp(-red*21))*239/255,alpha=ca+sa*(1-ca),k=i*4;
    if(!alpha){out.fill(0,k,k+4);continue;}
    const fleck=(i*37%101)<9,weight=sa*(1-ca);
    out[k]=((fleck?210:174)*ca+(113+grain)*weight)/alpha;
    out[k+1]=((fleck?123:43)*ca+(55+grain*.4)*weight)/alpha;
    out[k+2]=((fleck?49:19)*ca+25*weight)/alpha;
    out[k+3]=alpha*255;
  }
  return out;
}
