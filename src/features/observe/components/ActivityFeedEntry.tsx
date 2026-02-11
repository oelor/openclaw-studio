import type { ObserveEntry } from "../state/types";

const formatTime = (ts: number): string => {
  const d = new Date(ts);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  const ms = String(d.getMilliseconds()).padStart(3, "0");
  return `${h}:${m}:${s}.${ms}`;
};

const severityClass: Record<ObserveEntry["severity"], string> = {
  info: "text-muted-foreground",
  warn: "text-amber-400",
  error: "text-red-400",
};

const streamLabel = (entry: ObserveEntry): string => {
  if (entry.eventType === "heartbeat") return "heartbeat";
  if (entry.eventType === "presence") return "presence";
  if (entry.eventType === "chat") {
    return entry.chatState ? `chat:${entry.chatState}` : "chat";
  }
  if (entry.stream === "tool") {
    const name = entry.toolName ?? "?";
    const phase = entry.toolPhase ? `:${entry.toolPhase}` : "";
    return `tool${phase} ${name}`;
  }
  if (entry.stream === "lifecycle") {
    return `lifecycle:${entry.text ?? "?"}`;
  }
  if (entry.stream) return entry.stream;
  return entry.eventType;
};

type ActivityFeedEntryProps = {
  entry: ObserveEntry;
};

export const ActivityFeedEntry = ({ entry }: ActivityFeedEntryProps) => {
  const agentLabel = entry.agentId ?? entry.sessionKey?.slice(0, 12) ?? "-";

  return (
    <div
      className={`flex items-start gap-2 border-b border-border/30 px-3 py-1.5 font-mono text-[11px] leading-tight ${severityClass[entry.severity]}`}
    >
      <span className="shrink-0 text-muted-foreground/60">{formatTime(entry.timestamp)}</span>
      <span className="shrink-0 min-w-[80px] max-w-[120px] truncate font-semibold text-foreground/80">
        {agentLabel}
      </span>
      <span className="shrink-0 min-w-[100px] max-w-[160px] truncate text-primary/70">
        {streamLabel(entry)}
      </span>
      {entry.errorMessage && (
        <span className="truncate text-red-400">{entry.errorMessage}</span>
      )}
      {!entry.errorMessage && entry.text && (
        <span className="truncate text-muted-foreground">{entry.text}</span>
      )}
    </div>
  );
};
