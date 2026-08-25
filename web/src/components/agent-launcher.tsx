import { useState } from "react";
import { Loader2, ShieldCheck, Zap } from "lucide-react";

import { AgentIcon } from "@/components/agent-icon";
import { startAgent } from "@/lib/api";
import { LAUNCH_AGENTS, type LaunchAgent } from "@/lib/launch-agents";
import { setStatus } from "@/lib/status";

export function AgentLauncher({ paneId, session }: { paneId: string; session?: string }) {
  const [launching, setLaunching] = useState<string | null>(null);
  const [launched, setLaunched] = useState<string | null>(null);

  async function launch(agent: LaunchAgent) {
    if (launching !== null) return;
    setLaunching(agent.id);
    try {
      const response = await startAgent(paneId, agent.id, session);
      if (!response.ok) {
        setStatus(response.error, "error");
        setLaunching(null);
        return;
      }
      setStatus(`Launching ${agent.name}`, "success");
      setLaunched(agent.name);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error), "error");
      setLaunching(null);
    }
  }

  if (launched !== null) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Starting {launched}
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-y-auto px-4 py-6">
      <div className="m-auto w-full max-w-md">
        <div className="mb-5">
          <h2 className="text-xl font-semibold">Choose an agent</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Starts in auto mode through Herdr. Omo keeps its own permission flow.
          </p>
        </div>
        <div className="grid gap-2">
          {LAUNCH_AGENTS.map((agent) => (
            <button
              key={agent.id}
              type="button"
              disabled={launching !== null}
              onClick={() => void launch(agent)}
              aria-label={`Launch ${agent.name}`}
              className="flex min-h-16 items-center gap-3 rounded-xl border bg-card px-3 text-left transition-colors active:bg-muted/60 disabled:opacity-60"
            >
              <AgentIcon agent={agent.id} className="size-9" />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{agent.name}</span>
                <span className="block text-xs text-muted-foreground">{agent.description}</span>
              </span>
              {launching === agent.id ? (
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              ) : (
                agent.autoMode ? (
                  <Zap className="size-4 text-amber-500" aria-label="Auto mode" />
                ) : (
                  <ShieldCheck className="size-4 text-muted-foreground" aria-label="Own permissions" />
                )
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
