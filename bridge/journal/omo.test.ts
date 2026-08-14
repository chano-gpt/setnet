import { describe, expect, test } from "bun:test";

import { chooseSessionCandidate, sessionStartedAt } from "./omo.ts";

describe("sessionStartedAt", () => {
  test("parses Pi's filesystem-safe ISO timestamp", () => {
    expect(
      sessionStartedAt("2026-08-13T17-18-25-649Z_019ffc21-dd71-7ed9-aaa4-4c1380480454.jsonl"),
    ).toBe(Date.parse("2026-08-13T17:18:25.649Z"));
  });
});

describe("chooseSessionCandidate", () => {
  test("selects the session created immediately after the pane process", () => {
    expect(
      chooseSessionCandidate(10_000, [
        { path: "/sessions/old.jsonl", startedAtMs: 1_000 },
        { path: "/sessions/pane.jsonl", startedAtMs: 12_000 },
        { path: "/sessions/other.jsonl", startedAtMs: 50_000 },
      ]),
    ).toEqual({ path: "/sessions/pane.jsonl", startedAtMs: 12_000 });
  });

  test("returns null instead of guessing outside the startup window", () => {
    expect(
      chooseSessionCandidate(10_000, [
        { path: "/sessions/old.jsonl", startedAtMs: 1_000 },
        { path: "/sessions/new.jsonl", startedAtMs: 50_000 },
      ]),
    ).toBeNull();
  });
});
