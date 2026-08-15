import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Send } from "lucide-react";

import { BottomSheet } from "@/components/ui/sheet";
import { InlineCommandMenu } from "@/components/inline-command-menu";
import { Button } from "@/components/ui/button";
import { commandsFor, type AgentCommand } from "@/lib/agent-commands";
import { promptAgent } from "@/lib/api";
import { setStatus } from "@/lib/status";
import type { AgentView } from "@/lib/types";

interface DashboardComposerProps {
  agent: AgentView | null;
  session?: string;
  readOnly: boolean;
  onClose: () => void;
}

export function DashboardComposer({
  agent,
  session,
  readOnly,
  onClose,
}: DashboardComposerProps) {
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const paneId = agent?.paneId;
  const commands = useMemo(() => commandsFor(agent?.agent), [agent?.agent]);
  const query = /^\/[^\s]*$/.test(value) ? value.toLowerCase() : null;
  const matches = query === null ? [] : commands.filter((item) => item.command.startsWith(query));
  const menuOpen = query !== null && commands.length > 0 && !readOnly;

  useEffect(() => {
    if (paneId === undefined) return;
    setValue("");
    setSelectedIndex(0);
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [paneId]);

  function selectCommand(command: AgentCommand) {
    setValue(command.takesArg ? `${command.command} ` : command.command);
    setSelectedIndex(0);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.nativeEvent.isComposing) return;
    if (menuOpen && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      setSelectedIndex((current) => {
        if (matches.length === 0) return 0;
        return (current + direction + matches.length) % matches.length;
      });
      return;
    }
    if (menuOpen && event.key === "Enter" && !event.shiftKey && matches.length > 0) {
      event.preventDefault();
      selectCommand(matches[selectedIndex] ?? matches[0]!);
      return;
    }
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      void send();
    }
  }

  async function send() {
    const text = value.trim();
    if (agent === null || text === "" || sending || readOnly) return;
    setSending(true);
    try {
      await promptAgent(agent.paneId, text, session);
      setValue("");
      setStatus("Message sent", "success");
      onClose();
    } catch (error) {
      setStatus((error as Error).message, "error");
      inputRef.current?.focus();
    } finally {
      setSending(false);
    }
  }

  return (
    <BottomSheet
      open={agent !== null}
      onClose={onClose}
      title={agent ? `Message ${agent.workspaceLabel}` : "Message agent"}
      className="mx-auto max-w-screen-sm overflow-visible"
    >
      <div className="relative space-y-3" data-testid="dashboard-composer">
        {menuOpen && (
          <InlineCommandMenu
            commands={matches}
            selectedIndex={selectedIndex}
            onSelect={selectCommand}
          />
        )}
        <textarea
          ref={inputRef}
          aria-label="Message"
          rows={3}
          value={value}
          disabled={readOnly || sending}
          placeholder={readOnly ? "This device is read-only" : "Message this agent…"}
          className="w-full resize-none rounded-2xl border bg-background px-4 py-3 text-base outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          onChange={(event) => {
            setValue(event.target.value);
            setSelectedIndex(0);
          }}
          onKeyDown={onKeyDown}
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">Type / for commands · Ctrl/⌘ Enter to send</span>
          <Button
            type="button"
            disabled={readOnly || sending || value.trim() === ""}
            onClick={() => void send()}
          >
            <Send className="size-4" aria-hidden="true" />
            Send
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}
