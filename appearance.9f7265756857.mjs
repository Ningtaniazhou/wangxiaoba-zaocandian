// Shared cooked-base / wet-cover interpretation for the pan, result and debug view.
export const clamp01 = v => Math.max(0,Math.min(1,v));
export function smoothstep(low,high,v) {
  const t=clamp01((v-low)/(high-low));return t*t*(3-2*t);
}
export function surfaceToast(cook,browning,thickness=.2) {
  // A substantial wet covering hides old browning; a tiny coating does not.
  const wetThickness=Math.max(0,thickness*(1-clamp01(cook)));
  return clamp01(browning)*(1-smoothstep(.015,.10,wetThickness));
}
export function batterColor(cook,browning,variation=.5,thickness=.2) {
  const solid=thickness*clamp01(cook),wet=Math.max(0,thickness-solid);
  // A translucent wet film sits over the fixed cooked base. A tiny film does
  // not repaint that base as pale raw dough when its percentage changes.
  const cover=smoothstep(.015,.10,wet);
  const golden=smoothstep(0,.10,solid);
  const toast=clamp01(browning)*(.92+variation*.08)*(1-cover);
  const base=[246-11*golden,225-29*golden,177-52*golden];
  const raw=[246,225,177],char=[50,32,21];
  return base.map((v,i)=>(v*(1-cover)+raw[i]*cover)*(1-toast)+char[i]*toast);
}
