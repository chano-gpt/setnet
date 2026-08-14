import { readdir } from "node:fs/promises";
import { join } from "node:path";

import { containedRealpath } from "./files.ts";
import { PiTranscriptSource, parsePiTranscript } from "./pi.ts";
import type { AgentSessionRef, JournalAdapter } from "./types.ts";

const SESSION_START_TOLERANCE_MS = 30_000;

interface SessionCandidate {
  path: string;
  startedAtMs: number;
}

export function sessionStartedAt(name: string): number | null {
  const timestamp = name.match(
    /^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z_[\w-]+\.jsonl$/,
  );
  if (timestamp === null) return null;
  const startedAtMs = Date.parse(
    `${timestamp[1]}T${timestamp[2]}:${timestamp[3]}:${timestamp[4]}.${timestamp[5]}Z`,
  );
  return Number.isFinite(startedAtMs) ? startedAtMs : null;
}

export function chooseSessionCandidate(
  processStartedAtMs: number,
  candidates: readonly SessionCandidate[],
): SessionCandidate | null {
  return (
    candidates
      .filter(
        ({ startedAtMs }) =>
          startedAtMs >= processStartedAtMs - 2_000 &&
          startedAtMs <= processStartedAtMs + SESSION_START_TOLERANCE_MS,
      )
      .sort(
        (left, right) =>
          Math.abs(left.startedAtMs - processStartedAtMs) -
          Math.abs(right.startedAtMs - processStartedAtMs),
      )[0] ?? null
  );
}

async function sessionsForCwd(
  roots: readonly string[],
  cwd: string,
): Promise<SessionCandidate[]> {
  const dir = `--${cwd.replace(/^[/\\]+/, "").replace(/[/\\:]+/g, "-")}--`;
  const candidates: SessionCandidate[] = [];

  for (const root of roots) {
    let names: string[];
    try {
      names = await readdir(join(root, dir));
    } catch {
      continue;
    }
    for (const name of names) {
      const startedAtMs = sessionStartedAt(name);
      if (startedAtMs === null) continue;
      const path = await containedRealpath(join(root, dir, name), root);
      if (path !== null) candidates.push({ path, startedAtMs });
    }
  }
  return candidates;
}

export function omoJournal(roots: string | readonly string[]): JournalAdapter {
  const rootList = typeof roots === "string" ? [roots] : roots;
  const source = new PiTranscriptSource(rootList);
  return {
    agent: "omo",
    source,
    discoverPaneSession: async (cwd, processStartedAtMs): Promise<AgentSessionRef | null> => {
      const candidate = chooseSessionCandidate(
        processStartedAtMs,
        await sessionsForCwd(rootList, cwd),
      );
      return candidate === null ? null : { kind: "path", value: candidate.path };
    },
    discoverSession: (cwd) => source.latestForCwd(cwd),
    parse: parsePiTranscript,
  };
}
