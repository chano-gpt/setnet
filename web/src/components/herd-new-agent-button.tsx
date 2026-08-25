import { Bot, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Thumb-reachable primary action for Herd. Kept outside the scrolling list so it never moves. */
export function HerdNewAgentButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)_+_4.75rem)] z-30 flex justify-center px-3">
      <Button
        type="button"
        size="lg"
        onClick={onClick}
        className="pointer-events-auto h-11 shadow-[0_8px_24px_color-mix(in_oklab,var(--foreground)_18%,transparent)]"
      >
        <span className="relative">
          <Bot className="size-4" aria-hidden />
          <Plus
            className="absolute -right-1.5 -top-1.5 size-2.5 rounded-full bg-primary"
            aria-hidden
          />
        </span>
        New agent
      </Button>
    </div>
  );
}
