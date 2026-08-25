import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

import { FONT_URLS } from "@/lib/sw-routes";

// setnet ships two KINDS of webfont, under opposite caching rules, and every one of these facts is
// silent when broken.
//
// The Nerd Font faces are LAZY: range-restricted to the private-use planes, cached by the SW on
// first use, and deliberately absent from the precache — ~1.1 MB is not something to charge an
// install for. The stylesheet, the service worker and the disk must agree on which files exist; a
// renamed file is a tofu box again (#70), and a URL the SW doesn't know gets swept out of the font
// cache on activate.
//
// The UI face (IBM Plex Sans) is the opposite: it is on the first paint of every screen, so it IS
// precached and is NOT in FONT_URLS — the SW never runtime-caches something workbox already holds.
// The precache assertion below is therefore not "no woff2" any more; it is "only this one", which
// is the part that would silently regress if someone widened the glob to `**/*.woff2` to "fix" a
// missing font.

const root = resolve(import.meta.dirname, "..");
const read = (p: string) => readFileSync(resolve(root, p), "utf8");
const css = read("src/index.css");
const cssUrls = [...css.matchAll(/url\("([^"]+\.woff2)"\)/g)].map((m) => m[1]!);
const lazyUrls = cssUrls.filter((u) => u.includes("nerd-symbols"));
const uiUrls = cssUrls.filter((u) => !u.includes("nerd-symbols"));

describe("bundled fonts", () => {
  it("declares one lazy face per private-use plane", () => {
    expect(css).toContain("unicode-range: U+E000-F8FF");
    expect(css).toContain("unicode-range: U+F0000-F1AFF");
    expect(lazyUrls).toHaveLength(2);
  });

  // One variable file covers 100–700, so a second UI face here means someone added a static weight
  // and quietly doubled the payload the precache carries on every install.
  it("ships exactly one UI face, covering the whole weight range", () => {
    expect(uiUrls).toHaveLength(1);
    expect(uiUrls[0]).toMatch(/^\/fonts\/plex-sans-/);
    expect(css).toContain("font-weight: 100 700");
  });

  // Plex has no Hangul on purpose: Korean falls through to the system face, which Android already
  // has. That only works if the range stays Latin and the fallback stack behind it is real.
  it("keeps the UI face Latin-only, with a fallback stack behind it", () => {
    expect(css).toContain("--font-sans:");
    expect(css).toMatch(/--font-sans:\s*"IBM Plex Sans",[\s\S]*?sans-serif;/);
    // Scoped to the declarations, not the file: index.css EXPLAINS in prose why the KR face is not
    // shipped, and a whole-file match would read that sentence as the thing it forbids.
    const families = [...css.matchAll(/font-family:\s*"([^"]+)"/g)].map((m) => m[1]!);
    expect(families).not.toContain("IBM Plex Sans KR");
    expect(uiUrls[0]).not.toMatch(/kr/i);
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
  });

  it.each([...FONT_URLS, ...uiUrls])("ships %s", (url) => {
    // Throws if the asset is missing — a rename that misses one side lands as tofu, not an error.
    expect(statSync(resolve(root, `public${url}`)).size).toBeGreaterThan(0);
  });

  // `[\s\S]`, not `.`: Prettier is free to wrap that array, and a newline-blind pattern would read
  // only the first line of it.
  it("precaches the UI face and nothing else from fonts/", () => {
    const config = read("vite.config.ts");
    const patterns = /globPatterns:\s*\[([\s\S]*?)\]/.exec(config)?.[1] ?? "";
    expect(patterns).toContain("fonts/plex-sans-*.woff2");
    // Every woff2 mention must be that one pattern. A widened `**/*.woff2` would sweep the ~1.1 MB
    // of Nerd Font back into every install, which is the regression this whole file exists for.
    const woff2Patterns = [...patterns.matchAll(/"([^"]*woff2[^"]*)"/g)].map((m) => m[1]!);
    expect(woff2Patterns).toEqual(["fonts/plex-sans-*.woff2"]);
    // And the brace-expanded catch-all must still not name woff2.
    expect(patterns).not.toMatch(/\{[^}]*woff2[^}]*\}/);
  });
});
