import { Bell, Search } from "lucide-react";

type AppHeaderProps = {
  operatorLabel?: string;
};

export function AppHeader({ operatorLabel = "Ops Engineer" }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-[var(--surface)]/90 px-4 py-3 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div className="relative hidden w-full max-w-md md:block">
          <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-slate-500" />
          <input
            aria-label="Search"
            placeholder="Search customers, operations, incidents..."
            className="h-9 w-full rounded-md border border-[var(--line)] bg-[var(--surface-muted)] pl-8 pr-3 text-sm outline-none ring-[var(--accent)] focus:ring-1"
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            className="rounded-md border border-[var(--line)] bg-[var(--surface-muted)] p-2"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
          </button>
          <div className="rounded-md border border-[var(--line)] bg-[var(--surface-muted)] px-3 py-1.5 text-xs">
            {operatorLabel}
          </div>
        </div>
      </div>
    </header>
  );
}
