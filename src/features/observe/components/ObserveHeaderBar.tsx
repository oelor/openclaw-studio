import Link from "next/link";
import type { GatewayStatus } from "@/lib/gateway/GatewayClient";

type ObserveHeaderBarProps = {
  status: GatewayStatus;
  paused: boolean;
  entryCount: number;
  interventionCount: number;
  onTogglePause: () => void;
  onClear: () => void;
};

const statusStyles: Record<GatewayStatus, { label: string; className: string }> = {
  disconnected: {
    label: "Disconnected",
    className: "border border-border/70 bg-muted text-muted-foreground",
  },
  connecting: {
    label: "Connecting",
    className: "border border-border/70 bg-secondary text-secondary-foreground",
  },
  connected: {
    label: "Connected",
    className: "border border-primary/30 bg-primary/15 text-foreground",
  },
};

export const ObserveHeaderBar = ({
  status,
  paused,
  entryCount,
  interventionCount,
  onTogglePause,
  onClear,
}: ObserveHeaderBarProps) => {
  const statusConfig = statusStyles[status];

  return (
    <header className="glass-panel flex items-center justify-between rounded-xl px-4 py-3">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="font-display text-2xl tracking-wide text-foreground">
            Milo Observe
          </h1>
          <p className="text-[10px] text-muted-foreground">
            Real-time gateway event monitor
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-md px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] ${statusConfig.className}`}
        >
          {statusConfig.label}
        </span>
        {interventionCount > 0 && (
          <span className="inline-flex items-center rounded-md border border-red-500/30 bg-red-500/15 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-red-400">
            {interventionCount} error{interventionCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] text-muted-foreground/60">
          {entryCount} events
        </span>
        <button
          type="button"
          onClick={onTogglePause}
          className="rounded-md border border-input/90 bg-background/70 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-foreground transition hover:bg-muted/65"
        >
          {paused ? "Resume" : "Pause"}
        </button>
        <button
          type="button"
          onClick={onClear}
          className="rounded-md border border-input/90 bg-background/70 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-foreground transition hover:bg-muted/65"
        >
          Clear
        </button>
        <Link
          href="/"
          className="rounded-md border border-input/90 bg-background/70 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-foreground transition hover:bg-muted/65"
        >
          Studio
        </Link>
      </div>
    </header>
  );
};
