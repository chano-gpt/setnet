import { readdir } from "node:fs/promises";
import { join } from "node:path";

import { containedRealpath, statFile } from "./files.ts";
import { PiTranscriptSource, parsePiTranscript } from "./pi.ts";
import type { AgentSessionRef, JournalAdapter, TranscriptEntry } from "./types.ts";

const SESSION_START_TOLERANCE_MS = 30_000;
const VISIBLE_MATCH_TAIL_BYTES = 512 * 1024;
const VISIBLE_MATCH_CANDIDATES = 16;

interface SessionCandidate {
  path: string;
  startedAtMs: number;
  mtimeMs?: number;
}

export interface VisibleSessionCandidate {
  path: string;
  text: string;
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
      if (path !== null) {
        const metadata = await statFile(path);
        candidates.push({ path, startedAtMs, ...(metadata ? { mtimeMs: metadata.mtimeMs } : {}) });
      }
    }
  }
  return candidates;
}

function normalizedWords(text: string): string[] {
  return (text.toLocaleLowerCase().match(/[\p{L}\p{N}_./:-]+/gu) ?? []).filter(Boolean);
}

/**
 * Select a log only when phrases from the terminal uniquely match it. OMO sessions can be resumed
 * by a new process days after their timestamped JSONL was created, so process time cannot identify
 * them. Short/common UI strings are ignored and a tied score deliberately returns null.
 */
export function chooseVisibleSession<T extends VisibleSessionCandidate>(
  visibleText: string,
  candidates: readonly T[],
): T | null {
  const fingerprints = new Set<string>();
  for (const line of visibleText.split(/\r?\n/).slice(-160)) {
    const words = normalizedWords(line);
    for (let size = Math.min(8, words.length); size >= 2; size -= 1) {
      for (let start = 0; start + size <= words.length; start += 1) {
        const phrase = words.slice(start, start + size).join(" ");
        if (phrase.length >= 20) fingerprints.add(phrase);
      }
    }
  }
  if (fingerprints.size === 0) return null;

  const scored = candidates
    .map((candidate) => {
      const haystack = normalizedWords(candidate.text).join(" ");
      let score = 0;
      for (const phrase of fingerprints) {
        if (haystack.includes(phrase)) score += phrase.length;
      }
      return { candidate, score };
    })
    .sort((left, right) => right.score - left.score);
  const winner = scored[0];
  if (!winner || winner.score === 0 || winner.score === scored[1]?.score) return null;
  return winner.candidate;
}

function transcriptText(entries: readonly TranscriptEntry[]): string {
  const chunks: string[] = [];
  for (const entry of entries) {
    for (const part of entry.parts) {
      if (part.kind === "text" || part.kind === "thinking") chunks.push(part.text);
      else if (part.kind === "tool") {
        chunks.push(part.name, part.summary);
        if (part.result) chunks.push(part.result.text);
      } else {
        for (const phase of part.phases) {
          chunks.push(phase.name, ...phase.tasks.map((task) => task.content));
        }
      }
    }
  }
  return chunks.join("\n");
}

async function loadMatchTail(path: string): Promise<string> {
  const metadata = await statFile(path);
  if (metadata === null) return "";
  const file = Bun.file(path);
  const raw =
    metadata.size <= VISIBLE_MATCH_TAIL_BYTES
      ? await file.text()
      : await file.slice(metadata.size - VISIBLE_MATCH_TAIL_BYTES).text();
  return transcriptText(parsePiTranscript(raw));
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
    discoverVisibleSession: async (cwd, visibleText): Promise<AgentSessionRef | null> => {
      const sessions = (await sessionsForCwd(rootList, cwd))
        .sort((left, right) => (right.mtimeMs ?? 0) - (left.mtimeMs ?? 0))
        .slice(0, VISIBLE_MATCH_CANDIDATES);
      const candidates = await Promise.all(
        sessions.map(async ({ path }) => ({ path, text: await loadMatchTail(path) })),
      );
      const match = chooseVisibleSession(visibleText, candidates);
      return match === null ? null : { kind: "path", value: match.path };
    },
    // A resumed OMO conversation keeps its original timestamped filename. Follow the JSONL that is
    // actually being written, not the lexically newest filename from another session.
    discoverSession: (cwd, excluded = []) =>
      source.activeForCwd(
        cwd,
        excluded.filter((ref) => ref.kind === "path").map((ref) => ref.value),
      ),
    parse: parsePiTranscript,
  };
}
