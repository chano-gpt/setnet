import { useEffect, useState } from "react";
import { Loader2, Zap } from "lucide-react";

import { AgentIcon } from "@/components/agent-icon";
import { BottomSheet } from "@/components/ui/sheet";
import {
  LAUNCH_AGENTS,
  type LaunchAgentId,
} from "@/lib/launch-agents";
import { useHoldReload } from "@/lib/reload-guard";
import type { OperationResult, WorkspaceView } from "@/lib/types";

interface NewAgentSheetProps {
  open: boolean;
  workspaces: WorkspaceView[];
  onClose: () => void;
  onCreate: (workspaceId: string, kind: LaunchAgentId) => Promise<OperationResult>;
  onNewSpace: (kind: LaunchAgentId) => void;
}

export function NewAgentSheet({
  open,
  workspaces,
  onClose,
  onCreate,
  onNewSpace,
}: NewAgentSheetProps) {
  const [workspaceId, setWorkspaceId] = useState("");
  const [launching, setLaunching] = useState<LaunchAgentId | null>(null);
  const [error, setError] = useState<string | null>(null);
  useHoldReload("new-agent", open);

  // Reset transient state only on a real close → open transition. Snapshot polling replaces the
  // workspaces array every few seconds; tying `launching` to that identity would re-enable every
  // launch button while a slow managed start was still in flight.
  useEffect(() => {
    if (!open) return;
    setLaunching(null);
    setError(null);
  }, [open]);

  // Keep the target valid when spaces appear/disappear, without disturbing an in-flight launch.
  useEffect(() => {
    if (!open || launching !== null) return;
    setWorkspaceId((current) =>
      workspaces.some((workspace) => workspace.workspaceId === current)
        ? current
        : (workspaces[0]?.workspaceId ?? ""),
    );
  }, [launching, open, workspaces]);

  async function create(kind: LaunchAgentId) {
    if (!workspaceId || launching !== null) return;
    setLaunching(kind);
    setError(null);
    try {
      const result = await onCreate(workspaceId, kind);
      if (result.ok) onClose();
      else setError(result.error);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLaunching(null);
    }
  }

  const close = () => {
    if (launching === null) onClose();
  };

  return (
    <BottomSheet open={open} onClose={close} title="New agent">
      {workspaces.length === 0 ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Choose an agent, then set up its first space.
          </p>
          <ModeNotice />
          <AgentChoices
            launching={launching}
            target="a new space"
            onChoose={(kind) => {
              if (launching !== null) return;
              onClose();
              onNewSpace(kind);
            }}
          />
          <p className="text-xs text-muted-foreground">
            Omo is the exception and keeps its own permission flow.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Space
            </span>
            <select
              value={workspaceId}
              onChange={(event) => setWorkspaceId(event.target.value)}
              disabled={launching !== null}
              className="h-11 rounded-md border bg-background px-3 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {workspaces.map((workspace) => (
                <option key={workspace.workspaceId} value={workspace.workspaceId}>
                  {workspace.label}
                </option>
              ))}
            </select>
          </label>

          <div>
            <ModeNotice className="mb-2" />
            <AgentChoices
              launching={launching}
              target={
                workspaces.find((workspace) => workspace.workspaceId === workspaceId)?.label ??
                "space"
              }
              onChoose={(kind) => void create(kind)}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Omo is the exception and keeps its own permission flow.
            </p>
            {error && (
              <p
                role="alert"
                className="mt-3 rounded-md border border-status-blocked/50 bg-status-blocked/5 px-3 py-2 text-sm text-status-blocked"
              >
                {error}
              </p>
            )}
          </div>
        </div>
      )}
    </BottomSheet>
  );
}

function ModeNotice({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400 ${className}`}
    >
      <Zap className="size-3.5" aria-hidden />
      Auto mode · tool requests run without approval
    </div>
  );
}

function AgentChoices({
  launching,
  target,
  onChoose,
}: {
  launching: LaunchAgentId | null;
  target: string;
  onChoose: (kind: LaunchAgentId) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2" aria-busy={launching !== null}>
      {LAUNCH_AGENTS.map((agent) => (
        <button
          key={agent.id}
          type="button"
          disabled={launching !== null}
          onClick={() => onChoose(agent.id)}
          className="flex min-h-20 items-center gap-2.5 rounded-md border bg-card p-3 text-left transition-colors hover:bg-muted/60 active:scale-[0.98] disabled:opacity-60"
          aria-label={`Start ${agent.name} in ${target}`}
        >
          <AgentIcon agent={agent.id} className="size-8 shrink-0" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">{agent.name}</span>
            <span className="block text-[11px] text-muted-foreground">
              {agent.autoMode ? "Auto mode" : "Own permissions"}
            </span>
          </span>
          {launching === agent.id && <Loader2 className="ml-auto size-4 animate-spin" />}
        </button>
      ))}
    </div>
  );
}
