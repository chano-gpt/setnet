import { useEffect, useState } from "react";
import { Loader2, MessageSquareText, Terminal } from "lucide-react";

import { ChatMessageList } from "@/components/ui/chat/chat-message-list";
import { TranscriptView } from "@/components/transcript-view";
import { fetchHistory } from "@/lib/api";
import type { TranscriptEntry } from "@/lib/types";

interface LiveConversationProps {
  paneId: string;
  session?: string;
  agent?: string;
  onTerminal: () => void;
}

export function LiveConversation({
  paneId,
  session,
  agent,
  onTerminal,
}: LiveConversationProps) {
  const [entries, setEntries] = useState<TranscriptEntry[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "unavailable" | "error">("loading");

  useEffect(() => {
    let controller: AbortController | null = null;
    let stopped = false;

    const refresh = async () => {
      controller?.abort();
      controller = new AbortController();
      try {
        const response = await fetchHistory(
          paneId,
          { limit: 5000 },
          session,
          controller.signal,
        );
        if (stopped) return;
        if (!response.available) {
          setState("unavailable");
          return;
        }
        setEntries(response.entries);
        setState("ready");
      } catch (error: unknown) {
        if (!stopped && (error as Error).name !== "AbortError") setState("error");
      }
    };

    void refresh();
    const timer = window.setInterval(() => void refresh(), 1_500);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      controller?.abort();
    };
  }, [paneId, session]);

  if (state === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" />
        Loading conversation
      </div>
    );
  }

  if (state === "unavailable" || state === "error") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <MessageSquareText className="size-7 text-muted-foreground" />
        <div>
          <p className="font-medium">Conversation view is unavailable</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Open the terminal view to keep working with this pane.
          </p>
        </div>
        <button
          type="button"
          onClick={onTerminal}
          className="flex min-h-11 items-center gap-2 rounded-xl bg-muted px-4 text-sm font-medium"
        >
          <Terminal className="size-4" />
          Open terminal
        </button>
      </div>
    );
  }

  return (
    <ChatMessageList className="min-h-0 flex-1 px-3 py-4">
      {entries.length > 0 ? (
        <TranscriptView entries={entries} agent={agent} />
      ) : (
        <div className="py-16 text-center text-sm text-muted-foreground">
          Start the conversation below.
        </div>
      )}
    </ChatMessageList>
  );
}
