// Device Orientation uses Z-X-Y rotations in the phone's natural orientation.
// Project world-down into the display plane (CSS: x right, y down), then
// compensate for screen rotation. Reference: https://www.w3.org/TR/orientation-event/
export function gravityOnScreen(beta, gamma, angle = 0) {
  const b = beta * Math.PI / 180;
  const g = gamma * Math.PI / 180;
  const a = angle * Math.PI / 180;
  const x = Math.cos(b) * Math.sin(g);
  const y = Math.sin(b);
  return { x: x * Math.cos(a) + y * Math.sin(a), y: -x * Math.sin(a) + y * Math.cos(a) };
}

// Some embedded browsers expose a default primary angle while the legacy
// iPhone angle follows the actual screen. Prefer the value matching the viewport.
export function resolveScreenAngle(primary, legacy, landscape) {
  const values=[primary,legacy].filter(v=>typeof v==='number' && Number.isFinite(v));
  return values.find(v => (Math.abs(v % 180) === 90) === landscape) ?? values[0] ?? 0;
}
