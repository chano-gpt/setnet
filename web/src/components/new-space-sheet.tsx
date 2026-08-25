import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/ui/sheet";
import { useHoldReload } from "@/lib/reload-guard";
import type { OperationResult } from "@/lib/types";

interface NewSpaceSheetProps {
  open: boolean;
  onClose: () => void;
  onCreate: (opts: { label?: string; cwd?: string }) => Promise<OperationResult>;
  submitLabel?: string;
}

// Create a new space (workspace). Both fields are optional and dictation-friendly: leave the
// directory blank to open the shell in your home dir (it's a shell — cd from there), or set a path
// for a specific project. The new space opens either a fresh shell or a selected agent.
export function NewSpaceSheet({
  open,
  onClose,
  onCreate,
  submitLabel = "Create space & open shell",
}: NewSpaceSheetProps) {
  const [label, setLabel] = useState("");
  const [cwd, setCwd] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Don't let a self-update reload yank this tab/space form out from under a half-typed
  // directory/label — hold while it's open; the self-updater shows the banner and updates on close.
  useHoldReload("new-space", open);

  useEffect(() => {
    if (open) {
      setLabel("");
      setCwd("");
      setCreating(false);
      setError(null);
    }
  }, [open]);

  async function create() {
    if (creating) return;
    setCreating(true);
    setError(null);
    try {
      const result = await onCreate({
        label: label.trim() || undefined,
        cwd: cwd.trim() || undefined,
      });
      if (result.ok) onClose();
      else setError(result.error);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setCreating(false);
    }
  }

  const close = () => {
    if (!creating) onClose();
  };

  return (
    <BottomSheet open={open} onClose={close} title="New space">
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">Directory (optional)</span>
          <input
            value={cwd}
            onChange={(e) => setCwd(e.target.value)}
            disabled={creating}
            placeholder="~ (home dir)"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="h-11 rounded-lg border border-border bg-background px-3 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">Label (optional)</span>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            disabled={creating}
            placeholder="name this space"
            className="h-11 rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        {error && (
          <p
            role="alert"
            className="rounded-md border border-status-blocked/50 bg-status-blocked/5 px-3 py-2 text-sm text-status-blocked"
          >
            {error}
          </p>
        )}
        <Button onClick={() => void create()} disabled={creating} className="mt-1 h-11">
          {creating && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {submitLabel}
        </Button>
      </div>
    </BottomSheet>
  );
}
