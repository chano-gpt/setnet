import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { AlertTriangle, Send } from "lucide-react";

import { BottomSheet } from "@/components/ui/sheet";
import { InlineCommandMenu } from "@/components/inline-command-menu";
import { Button } from "@/components/ui/button";
import { commandsFor, type AgentCommand } from "@/lib/agent-commands";
import { promptAgent } from "@/lib/api";
import { isDestructiveInput } from "@/lib/destructive";
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
  // Armed by a first tap that hit a guard (destructive text, or an agent that is blocked); the
  // second tap inside the window sends. Mirrors the pane composer's two-tap shape rather than
  // inventing a second confirm language for the same decision.
  const [confirm, setConfirm] = useState<string | null>(null);
  // The failure the last send returned, kept IN the sheet. The global status row is one truncating
  // line that this sheet used to cover anyway — and it closed itself before the answer arrived.
  const [error, setError] = useState<string | null>(null);
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
    setConfirm(null);
    setError(null);
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

  // What this send has to be stopped for, or null to go ahead. Deliberately NOT the pane composer's
  // set: this sheet has no mirror, so it cannot see a dialog on screen or verify that the text
  // landed in the input box. What it does have is the snapshot's `status`, and `blocked` means the
  // agent is sitting on a question — free text sent there is swallowed and the Enter answers the
  // dialog with whatever was highlighted. That is exactly the #34 failure, reachable from Home.
  function guardReason(text: string): string | null {
    if (agent?.status === "blocked") {
      return "This agent is waiting on a question — your text may answer it instead.";
    }
    return isDestructiveInput(text);
  }

  async function send() {
    const text = value.trim();
    if (agent === null || text === "" || sending || readOnly) return;
    const reason = guardReason(text);
    if (reason !== null && confirm !== text) {
      setConfirm(text);
      setError(null);
      setStatus(reason, "warn");
      return;
    }
    setSending(true);
    setError(null);
    try {
      await promptAgent(agent.paneId, text, session);
      setValue("");
      setConfirm(null);
      // "Delivered", not "Sent": the bridge got the text into the pane, which is all a mirror-less
      // surface can honestly claim. Whether the agent ACCEPTED it is what the pane view verifies.
      setStatus("Message delivered", "success");
      onClose();
    } catch (err) {
      // Keep the sheet open and the draft intact. Closing on failure threw away the message the
      // user would have to retype, and left the reason in a status row behind a sheet that was
      // already gone.
      setError((err as Error).message);
      setConfirm(null);
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
            // An armed confirm belongs to the exact text that armed it; editing the draft disarms.
            if (confirm !== null) setConfirm(null);
          }}
          onKeyDown={onKeyDown}
        />
        {/* A blocked agent is knowable BEFORE the tap — say it up front rather than only on the
            confirm, so the sheet isn't the one surface that hides what the pane view would show. */}
        {agent?.status === "blocked" && (
          <div
            role="status"
            className="flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-700 dark:text-amber-400"
          >
            <AlertTriangle className="size-3 shrink-0" aria-hidden="true" />
            <span>Waiting on a question — open the pane to answer it.</span>
          </div>
        )}
        {error !== null && (
          <div
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive"
          >
            {error}
          </div>
        )}
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">Type / for commands · Ctrl/⌘ Enter to send</span>
          <Button
            type="button"
            variant={confirm === value.trim() && confirm !== null ? "destructive" : "default"}
            disabled={readOnly || sending || value.trim() === ""}
            onClick={() => void send()}
          >
            <Send className="size-4" aria-hidden="true" />
            {confirm === value.trim() && confirm !== null ? "Really send?" : "Send"}
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}
