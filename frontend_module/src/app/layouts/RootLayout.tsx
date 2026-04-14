import React, { useState, useEffect } from 'react';
import { Outlet, NavLink } from 'react-router';
import { clsx } from 'clsx';
import { LayoutDashboard, FlaskConical, LineChart, PlayCircle, History, Bot, ListOrdered } from 'lucide-react';
import { TopBar } from '../components/TopBar';

const NAV_ITEMS = [
  { path: '/', label: 'Live Dashboard', icon: LayoutDashboard },
  { path: '/orders', label: 'Orders & Activity', icon: ListOrdered },
  { path: '/strategy', label: 'Strategy Lab', icon: FlaskConical },
  { path: '/backtest', label: 'Backtest Engine', icon: LineChart },
  { path: '/runner', label: 'Bot Deployment', icon: PlayCircle },
  { path: '/history', label: 'Session History', icon: History },
];

export function RootLayout() {
  const [isDark, setIsDark] = useState(false);
  const [isRunning, setIsRunning] = useState(true);

  // Apply dark mode class to html element
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, [isDark]);

  return (
    <div className="w-full h-screen overflow-hidden flex flex-col bg-page font-sans text-tx-primary selection:bg-accent-bg">
      <TopBar 
        isRunning={isRunning} 
        toggleRunning={() => setIsRunning(!isRunning)} 
        isDark={isDark} 
        toggleTheme={() => setIsDark(!isDark)} 
      />
      
      <div className="flex-1 flex min-h-0">
        {/* Global Navigation Sidebar */}
        <div className="w-[200px] h-full flex flex-col bg-surface border-r border-border-subtle shrink-0 z-10">
          <div className="px-4 py-6 border-b border-border-subtle flex flex-col items-center gap-3">
            <div className="w-12 h-12 bg-elevated border border-border-default rounded-xl flex items-center justify-center shadow-sm relative">
               <Bot size={24} className="text-tx-secondary" />
               {isRunning && <div className="absolute -top-1 -right-1 w-3 h-3 bg-up rounded-full border-2 border-surface" />}
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
