import { useCallback, useState } from "react";

// Terminal mirror display preferences, persisted in localStorage.
// Safe to call in SSR contexts (localStorage guarded throughout).

export interface DisplayPrefs {
  /** Whether the mirror wraps long lines (default: true). The mirror is mostly agent prose, and a
   *  phone shows ~45-50 columns against panes herdr spawns at desktop width (190 in one reporter's
   *  session), so panning was the common case, not the exception. Column-faithful no-wrap for TUI
   *  tables stays one tap away in View. */
  wrap: boolean;
  /** Font size in px for the mirror pre (default: 12, range: 9–16). */
  fontSize: number;
  /**
   * Raw-terminal escape hatch (default: false). When on, the mirror renders the PLAIN terminal —
   * every Claude grammar (chrome stripping, native prompt-select buttons, the status strip) is
   * bypassed, so a misdetected/mis-rendered dialog can always be driven manually with the keys pad.
   * The universal fallback, made user-controllable.
   */
  rawTerminal: boolean;
  /**
   * Whether the agent's own statusline strip shows every row it has, or just the first
   * (default: false — just the first).
   *
   * The strip is stacked one row per line for good reasons (see agent-chat), but a configured
   * statusline is routinely 2–3 rows, and on a phone those rows come out of the mirror — the surface
   * the pane view exists to show. Most of what they carry is static between polls (model, mode,
   * cwd), so paying two rows for it continuously is the wrong default. Collapsed shows the first row
   * and a count; expanded is the old behaviour, unchanged.
   *
   * It lives in prefs rather than component state so the choice survives a pane switch: this
   * component remounts on every navigation, and a per-mount default would make "show me all of it"
   * something you re-tap all day.
   */
  statusExpanded: boolean;
}

// NOT bumped for statusExpanded: loadPrefs defaults every field it doesn't find, so an added
// optional key reads fine out of a v4 payload. Bumping would have thrown away everyone's wrap,
// font size and escape-hatch setting to introduce a field whose default is false anyway.
const STORAGE_KEY = "collie:display-prefs:v4";
export const FONT_MIN = 9;
export const FONT_MAX = 16;
const DEFAULTS: DisplayPrefs = {
  wrap: true,
  fontSize: 12,
  rawTerminal: false,
  statusExpanded: false,
};

function clampFont(n: number): number {
  return Math.max(FONT_MIN, Math.min(FONT_MAX, Math.round(n)));
}

function loadPrefs(): DisplayPrefs {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) return DEFAULTS;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return DEFAULTS;
    const p = parsed as Record<string, unknown>;
    return {
      wrap: typeof p.wrap === "boolean" ? p.wrap : DEFAULTS.wrap,
      fontSize: typeof p.fontSize === "number" ? clampFont(p.fontSize) : DEFAULTS.fontSize,
      rawTerminal: typeof p.rawTerminal === "boolean" ? p.rawTerminal : DEFAULTS.rawTerminal,
      statusExpanded:
        typeof p.statusExpanded === "boolean" ? p.statusExpanded : DEFAULTS.statusExpanded,
    };
  } catch {
    return DEFAULTS;
  }
}

function savePrefs(prefs: DisplayPrefs): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    }
  } catch {
    // Ignore quota / SSR write errors.
  }
}

export interface UseDisplayPrefsReturn {
  prefs: DisplayPrefs;
  /** Toggle or explicitly set line-wrap. */
  setWrap: (wrap: boolean) => void;
  /** Set font size, clamped to 9–16. */
  setFontSize: (size: number) => void;
  /** Step font size by delta (positive = larger), clamped to 9–16. */
  stepFontSize: (delta: number) => void;
  /** Toggle or explicitly set the raw-terminal escape hatch. */
  setRawTerminal: (raw: boolean) => void;
  /** Toggle or explicitly set whether the statusline strip shows all its rows. */
  setStatusExpanded: (expanded: boolean) => void;
}

export function useDisplayPrefs(): UseDisplayPrefsReturn {
  const [prefs, setPrefs] = useState<DisplayPrefs>(loadPrefs);

  const setWrap = useCallback((wrap: boolean) => {
    setPrefs((p) => {
      const next: DisplayPrefs = { ...p, wrap };
      savePrefs(next);
      return next;
    });
  }, []);

  const setFontSize = useCallback((size: number) => {
    setPrefs((p) => {
      const next: DisplayPrefs = { ...p, fontSize: clampFont(size) };
      savePrefs(next);
      return next;
    });
  }, []);

  const stepFontSize = useCallback((delta: number) => {
    setPrefs((p) => {
      const next: DisplayPrefs = { ...p, fontSize: clampFont(p.fontSize + delta) };
      savePrefs(next);
      return next;
    });
  }, []);

  const setRawTerminal = useCallback((rawTerminal: boolean) => {
    setPrefs((p) => {
      const next: DisplayPrefs = { ...p, rawTerminal };
      savePrefs(next);
      return next;
    });
  }, []);

  const setStatusExpanded = useCallback((statusExpanded: boolean) => {
    setPrefs((p) => {
      const next: DisplayPrefs = { ...p, statusExpanded };
      savePrefs(next);
      return next;
    });
  }, []);

  return { prefs, setWrap, setFontSize, stepFontSize, setRawTerminal, setStatusExpanded };
}
