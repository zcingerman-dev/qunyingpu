// Shared hit test: DOM coordinates already include zoom and scaling.
export function inLowerThird(rect, clientY) {
 return !!rect && Number.isFinite(clientY) && rect.height > 0 && clientY >= rect.top + rect.height * 2 / 3 && clientY <= rect.bottom;
}
