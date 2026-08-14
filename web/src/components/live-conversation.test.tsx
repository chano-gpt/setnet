import { act, render, screen } from "@testing-library/react";
import { vi } from "vitest";

import { fetchHistory } from "@/lib/api";
import { LiveConversation } from "./live-conversation";

vi.mock("@/lib/api", () => ({
  fetchHistory: vi.fn(),
}));

const mockedFetchHistory = vi.mocked(fetchHistory);

describe("LiveConversation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockedFetchHistory.mockReset();
    Element.prototype.scrollTo = vi.fn();
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("refreshes new transcript turns while the conversation surface stays mounted", async () => {
    mockedFetchHistory
      .mockResolvedValueOnce({
        paneId: "w1:p1",
        available: true,
        entries: [
          { uuid: "u1", ts: "", role: "user", parts: [{ kind: "text", text: "first" }] },
        ],
        hasMore: false,
        total: 1,
        fileTruncated: false,
      })
      .mockResolvedValueOnce({
        paneId: "w1:p1",
        available: true,
        entries: [
          { uuid: "u1", ts: "", role: "user", parts: [{ kind: "text", text: "first" }] },
          { uuid: "a1", ts: "", role: "assistant", parts: [{ kind: "text", text: "latest" }] },
        ],
        hasMore: false,
        total: 2,
        fileTruncated: false,
      });

    render(
      <LiveConversation
        paneId="w1:p1"
        agent="omo"
        onTerminal={vi.fn()}
      />,
    );

    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByText("first")).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_500);
    });

    expect(screen.getByText("latest")).toBeInTheDocument();
    expect(mockedFetchHistory).toHaveBeenCalledTimes(2);
  });

  it("does not overlap refreshes when history is slower than the cadence", async () => {
    let resolveHistory!: (value: Awaited<ReturnType<typeof fetchHistory>>) => void;
    mockedFetchHistory.mockReturnValue(
      new Promise((resolve) => {
        resolveHistory = resolve;
      }),
    );

    render(<LiveConversation paneId="w1:p1" agent="pi" onTerminal={vi.fn()} />);
    expect(mockedFetchHistory).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_000);
    });
    expect(mockedFetchHistory).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveHistory({
        paneId: "w1:p1",
        available: true,
        entries: [],
        hasMore: false,
        total: 0,
        fileTruncated: false,
      });
      await Promise.resolve();
    });
  });

  it("stops polling after the adapter reports history unavailable", async () => {
    mockedFetchHistory.mockResolvedValue({
      paneId: "w1:p1",
      available: false,
      reason: "no-log",
    });

    render(<LiveConversation paneId="w1:p1" agent="agy" onTerminal={vi.fn()} />);
    await act(async () => {
      await Promise.resolve();
      await vi.advanceTimersByTimeAsync(4_500);
    });

    expect(mockedFetchHistory).toHaveBeenCalledTimes(1);
  });

  it("waits for a visible document before loading or polling", async () => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    });
    mockedFetchHistory.mockResolvedValue({
      paneId: "w1:p1",
      available: true,
      entries: [],
      hasMore: false,
      total: 0,
      fileTruncated: false,
    });

    render(<LiveConversation paneId="w1:p1" agent="codex" onTerminal={vi.fn()} />);
    expect(mockedFetchHistory).not.toHaveBeenCalled();

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      await Promise.resolve();
    });

    expect(mockedFetchHistory).toHaveBeenCalledTimes(1);
  });

  it("requests a bounded tail and renders only the newest 60 entries", async () => {
    mockedFetchHistory.mockResolvedValue({
      paneId: "w1:p1",
      available: true,
      entries: Array.from({ length: 100 }, (_, index) => ({
        uuid: `u${index}`,
        ts: "",
        role: "user" as const,
        parts: [{ kind: "text" as const, text: `turn ${index}` }],
      })),
      hasMore: true,
      total: 100,
      fileTruncated: false,
    });

    render(<LiveConversation paneId="w1:p1" agent="claude" onTerminal={vi.fn()} />);
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockedFetchHistory).toHaveBeenCalledWith(
      "w1:p1",
      { limit: 200 },
      undefined,
      expect.any(AbortSignal),
    );
    expect(screen.queryByText("turn 39")).not.toBeInTheDocument();
    expect(screen.getByText("turn 40")).toBeInTheDocument();
    expect(screen.getByText("turn 99")).toBeInTheDocument();
  });
});
