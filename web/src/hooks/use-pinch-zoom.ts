import { useRef } from "react";
import type { TouchEvent } from "react";

// How far the fingers must spread before the first step lands. Below this a two-finger rest on the
// screen (common while holding the phone) would resize the mirror by itself.
const DEAD_ZONE = 1.08;

/**
 * The font size a pinch of `ratio` should produce, given the size the gesture STARTED at. Ratio is
 * current finger distance ÷ starting distance, so 2.0 is "spread twice as wide".
 *
 * Scaling the start value (rather than the live one) is what makes a pinch reversible: pinch out and
 * back and you land exactly where you began, because every frame is computed from the same anchor
 * instead of compounding its own rounding. `Math.round` on a compounding value would drift a step
 * per frame and the gesture could never return to its origin.
 *
 * The dead zone applies symmetrically — inside `1/DEAD_ZONE … DEAD_ZONE` the answer is the start
 * size unchanged. Exported for its own unit tests; the hook below is just pointers around it.
 */
export function pinchFontSize(
  startSize: number,
  ratio: number,
  min: number,
  max: number,
  deadZone = DEAD_ZONE,
): number {
  if (ratio < deadZone && ratio > 1 / deadZone) return startSize;
  return Math.max(min, Math.min(max, Math.round(startSize * ratio)));
}

function distance(a: { clientX: number; clientY: number }, b: { clientX: number; clientY: number }): number {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

export interface PinchZoomOptions {
  /** The size the gesture starts from — read once per pinch, not per frame. */
  fontSize: number;
  min: number;
  max: number;
  onChange: (size: number) => void;
}

/**
 * Pinch-to-zoom the terminal mirror. Spread the returned handlers onto the element wrapping it.
 *
 * The mirror is the one surface in this app people came to READ, and the only way to resize it was
 * A+/A− three levels deep behind the Controls gear. Pinch is the gesture a phone user tries first.
 *
 * Two things this deliberately does NOT do:
 *
 *  * It never calls `preventDefault`, and it sets no `touch-action`. One finger must keep scrolling
 *    the mirror and panning a wide TUI table (`ansi-output`'s `[touch-action:pan-x_pan-y]`), and a
 *    hook that claimed the gesture stream would take those away to catch a two-finger case.
 *  * It doesn't animate. `fontSize` is an integer step (9–16), so the mirror reflows to a real size
 *    on each step; a smooth transform would show a blurred scale that snaps at the end.
 *
 * `pinching` is exposed because a pinch ends in a click on most browsers, and the mirror's click
 * opens the keyboard — resizing text should not summon a keyboard over what you just made readable.
 */
export function usePinchZoom({ fontSize, min, max, onChange }: PinchZoomOptions) {
  // Live value, so the handlers below don't need to be re-created every time the size changes.
  const sizeRef = useRef(fontSize);
  sizeRef.current = fontSize;
  const gesture = useRef<{ startDistance: number; startSize: number } | null>(null);
  // Set the moment a pinch is recognised, cleared on the next non-pinch touch start. Read by the
  // click handler, which fires AFTER touchend.
  const pinched = useRef(false);

  return {
    /** True when the last touch sequence was a pinch — use it to swallow the trailing click. */
    pinching: pinched,
    handlers: {
      onTouchStart: (e: TouchEvent) => {
        if (e.touches.length !== 2) {
          gesture.current = null;
          pinched.current = false;
          return;
        }
        const [a, b] = [e.touches[0]!, e.touches[1]!];
        gesture.current = { startDistance: distance(a, b), startSize: sizeRef.current };
        pinched.current = true;
      },
      onTouchMove: (e: TouchEvent) => {
        const g = gesture.current;
        if (!g || e.touches.length !== 2 || g.startDistance === 0) return;
        const next = pinchFontSize(
          g.startSize,
          distance(e.touches[0]!, e.touches[1]!) / g.startDistance,
          min,
          max,
        );
        if (next !== sizeRef.current) onChange(next);
      },
      onTouchEnd: () => {
        gesture.current = null;
      },
    },
  };
}
