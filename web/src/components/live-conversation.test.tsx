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
});
