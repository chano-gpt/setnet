import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

import { FONT_URLS } from "@/lib/sw-routes";

// setnet's webfonts follow two opposite caching rules, and every one of these facts is silent when
// broken.
//
// The Nerd Font faces are LAZY: range-restricted to the private-use planes, cached by the SW on
// first use, and deliberately absent from the precache — ~1.1 MB is not something to charge an
// install for. The stylesheet, the service worker and the disk must agree on which files exist; a
// renamed file is a tofu box again (#70), and a URL the SW doesn't know gets swept out of the font
// cache on activate.
//
// The first-paint faces (IBM Plex Sans and Space Mono) are the opposite: they ARE precached and are
// NOT in FONT_URLS — the SW never runtime-caches something workbox already holds. The assertion
// below pins those explicit patterns so a broad `**/*.woff2` cannot pull the lazy faces in too.

const root = resolve(import.meta.dirname, "..");
const read = (p: string) => readFileSync(resolve(root, p), "utf8");
const css = read("src/index.css");
const cssUrls = [...css.matchAll(/url\("([^"]+\.woff2)"\)/g)].map((m) => m[1]!);
const nerdUrls = cssUrls.filter((u) => u.includes("nerd-symbols"));
const krUrls = cssUrls.filter((u) => u.includes("plex-kr"));
const uiUrls = cssUrls.filter((u) => u.includes("plex-sans"));
const monoUrls = cssUrls.filter((u) => u.includes("space-mono"));
const lazyUrls = [...krUrls, ...nerdUrls];

describe("bundled fonts", () => {
  it("declares one lazy face per private-use plane", () => {
    expect(css).toContain("unicode-range: U+E000-F8FF");
    expect(css).toContain("unicode-range: U+F0000-F1AFF");
    expect(nerdUrls).toHaveLength(2);
  });

  // Plex Sans KR has no variable version upstream, so each weight is its own ~375 KB file. Two, and
  // the count is asserted because a third is another 375 KB for a register the UI does not use.
  it("ships the Hangul face at exactly the two weights the UI uses", () => {
    expect(krUrls).toHaveLength(2);
    expect(krUrls.some((u) => u.includes("-400-"))).toBe(true);
    expect(krUrls.some((u) => u.includes("-600-"))).toBe(true);
  });

  // The Latin face is listed first and covers Latin. If the Hangul subsets carried it too the
  // browser would still take Latin from the first available face — the bytes would just be wasted.
  it("keeps Latin out of the Hangul subsets", () => {
    const krRanges = [...css.matchAll(/plex-kr[\s\S]{0,220}?unicode-range:\s*([^;]+);/g)].map(
      (m) => m[1]!,
    );
    expect(krRanges).toHaveLength(2);
    for (const range of krRanges) {
      expect(range).toContain("U+AC00-D7A3");
      expect(range).not.toMatch(/U\+0000|U\+0020|U\+0100/);
    }
  });

  // Order in --font-sans is what makes the pair set as one typeface: Latin face, then Hangul face,
  // then the platform stack. Reversed, a mixed label takes Latin from whichever face answers first.
  it("orders the Latin face ahead of the Hangul face in the stack", () => {
    const stack = /--font-sans:([\s\S]*?);/.exec(css)?.[1] ?? "";
    expect(stack.indexOf('"IBM Plex Sans"')).toBeGreaterThanOrEqual(0);
    expect(stack.indexOf('"IBM Plex Sans"')).toBeLessThan(stack.indexOf('"IBM Plex Sans KR"'));
  });

  // One variable file covers 100–700, so a second UI face here means someone added a static weight
  // and quietly doubled the payload the precache carries on every install.
  it("ships exactly one UI face, covering the whole weight range", () => {
    expect(uiUrls).toHaveLength(1);
    expect(uiUrls[0]).toMatch(/^\/fonts\/plex-sans-/);
    expect(css).toContain("font-weight: 100 700");
  });

  it("uses Space Mono for monospace text at the two product weights", () => {
    const stack = /--font-mono:([\s\S]*?);/.exec(css)?.[1] ?? "";
    expect(stack).toMatch(/^\s*"Nerd Font Symbols", "Space Mono"/);
    expect(stack).not.toContain("JetBrains Mono");
    expect(monoUrls).toHaveLength(2);
    expect(monoUrls.some((u) => u.includes("-400-"))).toBe(true);
    expect(monoUrls.some((u) => u.includes("-700-"))).toBe(true);
  });

  // Plex has no Hangul on purpose: Korean falls through to the system face, which Android already
  // has. That only works if the range stays Latin and the fallback stack behind it is real.
  it("keeps the Latin UI face Latin-only, with a fallback stack behind it", () => {
    expect(css).toContain("--font-sans:");
    expect(css).toMatch(/--font-sans:\s*"IBM Plex Sans",[\s\S]*?sans-serif;/);
    expect(uiUrls[0]).not.toMatch(/-kr-/);
  });

  // Drift here is the whole failure mode: the SW sweeps every font-cache entry it can't name, so a
  // stylesheet URL missing from FONT_URLS would be re-fetched on every cold load, forever.
  it("names the same lazy files in the stylesheet and the service worker", () => {
    expect(lazyUrls).toEqual([...FONT_URLS]);
  });

  // The UI face is precached, so runtime-caching it too would have the activate sweep and workbox
  // both holding the same bytes under different keys.
  it("keeps the precached UI face out of the runtime font cache", () => {
    expect(FONT_URLS).not.toContain(uiUrls[0]);
    for (const url of monoUrls) expect(FONT_URLS).not.toContain(url);
  });

  it.each([...FONT_URLS, ...uiUrls, ...monoUrls])("ships %s", (url) => {
    // Throws if the asset is missing — a rename that misses one side lands as tofu, not an error.
    expect(statSync(resolve(root, `public${url}`)).size).toBeGreaterThan(0);
  });

  // `[\s\S]`, not `.`: Prettier is free to wrap that array, and a newline-blind pattern would read
  // only the first line of it.
  it("precaches the first-paint faces and nothing else from fonts/", () => {
    const config = read("vite.config.ts");
    const patterns = /globPatterns:\s*\[([\s\S]*?)\]/.exec(config)?.[1] ?? "";
    expect(patterns).toContain("fonts/plex-sans-*.woff2");
    // A widened `**/*.woff2` would sweep the ~1.1 MB of Nerd Font back into every install, which is
    // the regression this whole file exists for.
    const woff2Patterns = [...patterns.matchAll(/"([^"]*woff2[^"]*)"/g)].map((m) => m[1]!);
    expect(woff2Patterns).toEqual(["fonts/plex-sans-*.woff2", "fonts/space-mono-*.woff2"]);
    // And the brace-expanded catch-all must still not name woff2.
    expect(patterns).not.toMatch(/\{[^}]*woff2[^}]*\}/);
  });
});
