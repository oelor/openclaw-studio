import type { ObserveEntry } from "../state/types";

type InterventionAlertsProps = {
  entries: ObserveEntry[];
};

const MAX_ALERTS = 10;

const formatTime = (ts: number): string => {
  const d = new Date(ts);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  return `${h}:${m}:${s}`;
};

export const InterventionAlerts = ({ entries }: InterventionAlertsProps) => {
  const errors = entries.filter((e) => e.severity === "error");
  if (errors.length === 0) return null;

  const recent = errors.slice(-MAX_ALERTS).reverse();
  const hiddenCount = errors.length > MAX_ALERTS ? errors.length - MAX_ALERTS : 0;

  return (
    <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-red-400">
          Intervention Needed
        </h2>
        <span className="font-mono text-[10px] text-red-400/60">
          {errors.length} error{errors.length !== 1 ? "s" : ""}
          {hiddenCount > 0 ? ` (+${hiddenCount} hidden)` : ""}
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        {recent.map((entry) => (
          <div
            key={entry.id}
            className="flex items-start gap-2 text-[11px]"
          >
            <span className="shrink-0 font-mono text-red-400/50">
              {formatTime(entry.timestamp)}
            </span>
            <span className="shrink-0 font-semibold text-foreground/80">
              {entry.agentId ?? entry.sessionKey?.slice(0, 12) ?? "-"}
            </span>
            <span className="truncate text-red-400">
              {entry.errorMessage ?? entry.text ?? "Unknown error"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
