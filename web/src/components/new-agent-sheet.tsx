import { useEffect, useState } from "react";
import { Loader2, Plus, Zap } from "lucide-react";

import { AgentIcon } from "@/components/agent-icon";
import { BottomSheet } from "@/components/ui/sheet";
import { LAUNCH_AGENTS } from "@/lib/launch-agents";
import { useHoldReload } from "@/lib/reload-guard";
import type { WorkspaceView } from "@/lib/types";

interface NewAgentSheetProps {
  open: boolean;
  workspaces: WorkspaceView[];
  onClose: () => void;
  onCreate: (workspaceId: string, kind: string) => Promise<boolean>;
  onNewSpace: () => void;
}

export function NewAgentSheet({
  open,
  workspaces,
  onClose,
  onCreate,
  onNewSpace,
}: NewAgentSheetProps) {
  const [workspaceId, setWorkspaceId] = useState("");
  const [launching, setLaunching] = useState<string | null>(null);
  useHoldReload("new-agent", open);

  useEffect(() => {
    if (!open) return;
    setWorkspaceId((current) =>
      workspaces.some((workspace) => workspace.workspaceId === current)
        ? current
        : (workspaces[0]?.workspaceId ?? ""),
    );
    setLaunching(null);
  }, [open, workspaces]);

  async function create(kind: string) {
    if (!workspaceId || launching !== null) return;
    setLaunching(kind);
    const created = await onCreate(workspaceId, kind);
    setLaunching(null);
    if (created) onClose();
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="New agent">
      {workspaces.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <p className="text-sm text-muted-foreground">Create a space before starting an agent.</p>
          <button
            type="button"
            onClick={() => {
              onClose();
              onNewSpace();
            }}
            className="flex min-h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground"
          >
            <Plus className="size-4" aria-hidden />
            New space
          </button>
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
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
              <Zap className="size-3.5" aria-hidden />
              Auto mode · tool requests run without approval
            </div>
            <div className="grid grid-cols-2 gap-2">
              {LAUNCH_AGENTS.map((agent) => (
                <button
                  key={agent.id}
                  type="button"
                  disabled={launching !== null}
                  onClick={() => void create(agent.id)}
                  className="flex min-h-20 items-center gap-2.5 rounded-md border bg-card p-3 text-left transition-colors hover:bg-muted/60 active:scale-[0.98] disabled:opacity-60"
                  aria-label={`Start ${agent.name} in ${workspaces.find((workspace) => workspace.workspaceId === workspaceId)?.label ?? "space"}`}
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
            <p className="mt-2 text-xs text-muted-foreground">
              Omo is the exception and keeps its own permission flow.
            </p>
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
