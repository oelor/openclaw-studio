type Trade = {
  market: string;
  position: string;
  outcome: string;
  pnl: number;
  timestamp: string;
};

type TradingPortfolio = {
  balance: number;
  initialBalance: number;
  totalTrades: number;
  recentTrades: Trade[];
};

type TradingPanelProps = {
  portfolio: TradingPortfolio | null;
  loading: boolean;
};

const pnlColor = (pnl: number): string => {
  if (pnl > 0) return "text-emerald-400";
  if (pnl < 0) return "text-red-400";
  return "text-muted-foreground";
};

const outcomeLabel = (outcome: string): { label: string; className: string } => {
  if (outcome === "won" || outcome === "win")
    return { label: "Won", className: "bg-emerald-500/15 text-emerald-400" };
  if (outcome === "lost" || outcome === "loss")
    return { label: "Lost", className: "bg-red-500/15 text-red-400" };
  return { label: "Open", className: "bg-primary/15 text-primary" };
};

export const TradingPanel = ({ portfolio, loading }: TradingPanelProps) => {
  if (loading) {
    return (
      <div className="px-3 py-4 text-center text-[11px] text-muted-foreground/50">
        Loading trading data...
      </div>
    );
  }

  if (!portfolio) {
    return (
      <div className="px-3 py-4 text-center text-[11px] text-muted-foreground/50">
        No trading data
      </div>
    );
  }

  const pnl = portfolio.balance - portfolio.initialBalance;
  const pnlPct = ((pnl / portfolio.initialBalance) * 100).toFixed(1);

  return (
    <div className="flex flex-col gap-2 p-2">
      <div className="flex items-center justify-between rounded-md bg-muted/20 px-2 py-1.5">
        <div className="text-[10px] text-muted-foreground/60">Balance</div>
        <div className="font-mono text-sm font-semibold text-foreground">
          ${portfolio.balance.toFixed(2)}
        </div>
      </div>
      <div className="flex items-center justify-between px-2">
        <div className="text-[10px] text-muted-foreground/60">
          P&L ({portfolio.totalTrades} trades)
        </div>
        <div className={`font-mono text-xs font-semibold ${pnlColor(pnl)}`}>
          {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)} ({pnlPct}%)
        </div>
      </div>
      <div className="mt-1 flex flex-col gap-0.5">
        {portfolio.recentTrades.map((trade, i) => {
          const badge = outcomeLabel(trade.outcome);
          return (
            <div
              key={i}
              className="flex items-center justify-between rounded-md px-2 py-1 text-[10px] hover:bg-muted/20"
            >
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium text-foreground/90">
                  {trade.market}
                </span>
                <span className="text-[9px] text-muted-foreground/50">
                  {trade.position}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`font-mono ${pnlColor(trade.pnl)}`}>
                  {trade.pnl >= 0 ? "+" : ""}${trade.pnl.toFixed(2)}
                </span>
                <span
                  className={`shrink-0 rounded px-1 py-0.5 text-[8px] font-bold uppercase tracking-wider ${badge.className}`}
                >
                  {badge.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export type { TradingPortfolio };
