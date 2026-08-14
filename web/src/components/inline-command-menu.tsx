import { AlertTriangle, CornerDownLeft } from "lucide-react";

import { cn } from "@/lib/utils";
import type { AgentCommand } from "@/lib/agent-commands";

interface InlineCommandMenuProps {
  commands: readonly AgentCommand[];
  selectedIndex: number;
  onSelect: (command: AgentCommand) => void;
}

export function InlineCommandMenu({
  commands,
  selectedIndex,
  onSelect,
}: InlineCommandMenuProps) {
  if (commands.length === 0) {
    return (
      <div className="absolute inset-x-0 bottom-full z-40 mb-2 rounded-2xl border bg-popover p-3 text-sm text-muted-foreground shadow-lg">
        No matching commands
      </div>
    );
  }

  return (
    <div
      role="listbox"
      aria-label="Agent command suggestions"
      className="absolute inset-x-0 bottom-full z-40 mb-2 max-h-72 overflow-y-auto rounded-2xl border bg-popover p-1.5 shadow-lg"
    >
      {commands.map((command, index) => {
        const selected = index === selectedIndex;
        return (
          <button
            key={command.command}
            type="button"
            role="option"
            aria-selected={selected}
            aria-label={`${command.command}${command.argHint ? ` ${command.argHint}` : ""}`}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onSelect(command)}
            className={cn(
              "flex min-h-14 w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left",
              "transition-colors active:scale-[0.99]",
              selected ? "bg-primary/10 text-foreground" : "hover:bg-muted",
            )}
          >
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 font-mono text-sm font-semibold">
                {command.command}
                {command.argHint && (
                  <span className="font-sans font-normal text-muted-foreground">
                    {command.argHint}
                  </span>
                )}
                {command.dangerous && (
                  <AlertTriangle className="size-3.5 shrink-0 text-destructive" aria-hidden="true" />
                )}
              </span>
              <span className="mt-0.5 block text-xs leading-4 text-muted-foreground">
                {command.description}
              </span>
            </span>
            {selected && <CornerDownLeft className="mt-1 size-4 shrink-0 text-primary" />}
          </button>
        );
      })}
    </div>
  );
}
