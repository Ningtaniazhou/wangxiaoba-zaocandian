// CSS handles standard browsers; WebKit gesture events cover native pinch zoom.
export function installTouchGuard(root){
 const cancel=e=>{if(e.cancelable)e.preventDefault();};
 const multi=e=>{if(e.touches?.length>1)cancel(e);};
 for(const type of ['gesturestart','gesturechange','gestureend','dblclick'])root.addEventListener(type,cancel,{passive:false});
 for(const type of ['touchstart','touchmove'])root.addEventListener(type,multi,{passive:false});
}
