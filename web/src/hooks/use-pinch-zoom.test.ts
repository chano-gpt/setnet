import { pinchFontSize } from "./use-pinch-zoom";

// The mirror is the surface people came to read, and a pinch is the gesture they try first. The
// decision logic is pure so it can be pinned without synthesising multi-touch events.
describe("pinchFontSize", () => {
  it("does nothing inside the dead zone, in either direction", () => {
    expect(pinchFontSize(12, 1, 9, 16)).toBe(12);
    expect(pinchFontSize(12, 1.05, 9, 16)).toBe(12); // a small spread
    expect(pinchFontSize(12, 0.95, 9, 16)).toBe(12); // a small squeeze
  });

  it("scales from the size the gesture started at", () => {
    expect(pinchFontSize(10, 1.5, 9, 16)).toBe(15);
    expect(pinchFontSize(12, 0.75, 9, 16)).toBe(9);
  });

  // Computing every frame from the same anchor is what makes a pinch reversible: out and back lands
  // exactly where it began. A compounding value would drift a rounding step per frame.
  it("is reversible — the same start and a ratio of 1 returns the origin", () => {
    const start = 11;
    const out = pinchFontSize(start, 1.4, 9, 16);
    expect(out).not.toBe(start);
    expect(pinchFontSize(start, 1, 9, 16)).toBe(start);
  });

  it("clamps to the display-prefs range rather than running past it", () => {
    expect(pinchFontSize(12, 10, 9, 16)).toBe(16);
    expect(pinchFontSize(12, 0.01, 9, 16)).toBe(9);
  });
});
