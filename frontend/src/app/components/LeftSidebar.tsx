import { clsx } from 'clsx';

export interface Coin {
  symbol: string;
  price: number | null;
  change: number | null;
  score: number;
  rank: number;
  active?: boolean;
}

interface LeftSidebarProps {
  coins: Coin[];
  activeSymbol: string;
  onSelectCoin: (symbol: string) => void;
}

function ScoreBadge({ score }: { score: number }) {
  let type = 'low';
  if (score >= 70) type = 'high';
  else if (score >= 50) type = 'mid';

  return (
    <span className={clsx(
      "font-mono text-[10px] font-medium px-[5px] py-[1px] rounded",
      type === 'high' && "bg-up-bg text-up",
      type === 'mid' && "bg-accent-bg text-accent",
      type === 'low' && "bg-border-subtle text-tx-tertiary"
    )}>
      {score}
    </span>
  );
}

export function LeftSidebar({ coins, activeSymbol, onSelectCoin }: LeftSidebarProps) {
  return (
    <div className="w-[240px] h-full flex flex-col bg-surface border-r border-border-subtle overflow-y-auto">
      <div className="px-4 py-3 border-b border-border-subtle shrink-0">
        <h3 className="text-[11px] font-medium uppercase tracking-[0.06em] text-tx-tertiary">
          Watchlist
        </h3>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {coins.map((coin) => {
          const isActive = coin.symbol === activeSymbol;
          return (
            <button
              key={coin.symbol}
              onClick={() => onSelectCoin(coin.symbol)}
              className={clsx(
                "w-full h-[52px] px-4 flex items-center justify-between relative transition-colors duration-120 ease-out group",
                isActive ? "bg-hover" : "hover:bg-hover bg-transparent"
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-accent" />
              )}
              
              <div className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full bg-border-default shrink-0 flex items-center justify-center">
                   <div className="w-1.5 h-1.5 rounded-full bg-tx-tertiary" />
                </div>
                <span className="text-[14px] font-medium text-tx-primary leading-none mt-0.5">
                  {coin.symbol}
                </span>
                <ScoreBadge score={coin.score} />
                <span className="font-mono text-[10px] text-tx-tertiary">#{coin.rank}</span>
              </div>
              
              <div className="flex flex-col items-end gap-0.5">
                <span className="font-mono text-[14px] font-medium text-tx-primary leading-none">
                  {coin.price == null
                    ? "--"
                    : coin.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className={clsx(
                  "font-mono text-[12px] leading-none",
                  coin.change == null ? "text-tx-tertiary" : coin.change >= 0 ? "text-up" : "text-down"
                )}>
                  {coin.change == null ? "--" : `${coin.change > 0 ? "+" : ""}${coin.change.toFixed(2)}%`}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
