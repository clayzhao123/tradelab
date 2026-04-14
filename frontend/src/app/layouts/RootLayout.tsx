import { useEffect, useMemo, useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router';
import { clsx } from 'clsx';
import { LayoutDashboard, FlaskConical, LineChart, PlayCircle, History, ListOrdered } from 'lucide-react';
import { TopBar } from '../components/TopBar';
import { DataProvider, useData } from '../contexts/DataContext';
import { MascotProvider, useMascot } from '../contexts/MascotContext';
import { RobotMascot } from '../components/mascot/RobotMascot';
import { deriveRobotMascotState } from '../components/mascot/robotMascotState';

const NAV_ITEMS = [
  { path: '/', label: 'Live Dashboard', icon: LayoutDashboard },
  { path: '/orders', label: 'Orders & Activity', icon: ListOrdered },
  { path: '/strategy', label: 'Strategy Lab', icon: FlaskConical },
  { path: '/backtest', label: 'Backtest Engine', icon: LineChart },
  { path: '/runner', label: 'Bot Deployment', icon: PlayCircle },
  { path: '/history', label: 'Session History', icon: History },
];

function RootLayoutInner() {
  const [isDark, setIsDark] = useState(false);
  const location = useLocation();
  const { activeRun, accountSummary, wsStatus, riskEvents } = useData();
  const { transient } = useMascot();
  const isRunning = Boolean(activeRun);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, [isDark]);

  const equity = accountSummary?.equity ?? 0;
  const drawdownPct = accountSummary?.drawdownPct ?? 0;
  const mascotSnapshot = useMemo(
    () =>
      deriveRobotMascotState({
        pathname: location.pathname,
        wsStatus,
        activeRun: activeRun ? { initialCash: activeRun.initialCash } : null,
        equity: accountSummary?.equity ?? null,
        drawdownPct: accountSummary?.drawdownPct ?? null,
        riskEvents,
        transient,
      }),
    [location.pathname, wsStatus, activeRun, accountSummary?.equity, accountSummary?.drawdownPct, riskEvents, transient],
  );

  return (
    <div className="w-full h-screen overflow-hidden flex flex-col bg-page font-sans text-tx-primary selection:bg-accent-bg">
      <TopBar
        isRunning={isRunning}
        isDark={isDark}
        toggleTheme={() => setIsDark(!isDark)}
        equity={equity}
        drawdownPct={drawdownPct}
        runStartedAt={activeRun?.startedAt ?? null}
        wsStatus={wsStatus}
      />

      <div className="flex-1 flex min-h-0">
        {/* Global Navigation Sidebar */}
        <div className="w-[200px] h-full flex flex-col bg-surface border-r border-border-subtle shrink-0 z-10">
          <div className="px-4 py-6 border-b border-border-subtle flex flex-col items-center gap-3">
            <div className="w-12 h-12 bg-elevated border border-border-default rounded-xl flex items-center justify-center shadow-sm">
              <RobotMascot snapshot={mascotSnapshot} />
            </div>
            <div className="text-center">
              <h1 className="text-[14px] font-bold tracking-wide">tradelab</h1>
              <p className="text-[10px] text-tx-tertiary uppercase tracking-widest mt-0.5">Paper Trading</p>
            </div>
          </div>

          <div className="flex-1 py-4 flex flex-col gap-1 px-3">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => clsx(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-150 group",
                  isActive
                    ? "bg-accent-bg text-accent font-medium shadow-sm"
                    : "text-tx-secondary hover:bg-hover hover:text-tx-primary font-normal"
                )}
              >
                {({ isActive }) => (
                  <>
                    <item.icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                    <span className="text-[13px]">{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>

          <div className="px-4 py-4 border-t border-border-subtle text-center text-[10px] text-tx-tertiary">
            v2.4.0 (Connected)
          </div>
        </div>

        {/* Main Content Outlet */}
        <div className="flex-1 min-w-0 bg-page relative overflow-y-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export function RootLayout() {
  return (
    <DataProvider>
      <MascotProvider>
        <RootLayoutInner />
      </MascotProvider>
    </DataProvider>
  );
}
