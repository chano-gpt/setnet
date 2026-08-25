import type { ReactNode } from "react";
import { Boxes, Settings, UsersRound } from "lucide-react";

import { cn } from "@/lib/utils";
import type { HomeSection } from "@/lib/nav";

interface MobileTabBarProps {
  active: HomeSection;
  attentionCount: number;
  onSelect: (section: HomeSection) => void;
  onSettings: () => void;
}

interface TabButtonProps {
  active?: boolean;
  label: string;
  accessibleLabel?: string;
  onClick: () => void;
  children: ReactNode;
}

function TabButton({
  active = false,
  label,
  accessibleLabel,
  onClick,
  children,
}: TabButtonProps) {
  return (
    <button
      type="button"
      aria-label={accessibleLabel ?? label}
      aria-current={active ? "page" : undefined}
      onClick={onClick}
      className={cn(
        "relative flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-md px-2",
        "text-[0.6875rem] font-medium transition-colors active:scale-[0.98]",
        active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
      <span>{label}</span>
    </button>
  );
}

export function MobileTabBar({
  active,
  attentionCount,
  onSelect,
  onSettings,
}: MobileTabBarProps) {
  const herdLabel = attentionCount > 0 ? `Herd, ${attentionCount} need attention` : "Herd";

  return (
    <nav
      aria-label="Primary"
      className="shrink-0 border-t border-border/60 bg-background/95 px-3 pt-2 pb-[calc(env(safe-area-inset-bottom)_+_0.5rem)] backdrop-blur-xl"
    >
      <div className="mx-auto flex max-w-sm gap-2">
        <TabButton
          active={active === "herd"}
          label="Herd"
          accessibleLabel={herdLabel}
          onClick={() => onSelect("herd")}
        >
          <span className="relative">
            <UsersRound className="size-5" />
            {attentionCount > 0 && (
              <span className="absolute -right-3 -top-2 min-w-4 rounded-full bg-status-blocked px-1 text-center text-[0.625rem] leading-4 text-white">
                {attentionCount > 99 ? "99+" : attentionCount}
              </span>
            )}
          </span>
        </TabButton>
        <TabButton active={active === "spaces"} label="Spaces" onClick={() => onSelect("spaces")}>
          <Boxes className="size-5" />
        </TabButton>
        <TabButton label="Settings" onClick={onSettings}>
          <Settings className="size-5" />
        </TabButton>
      </div>
    </nav>
  );
}
