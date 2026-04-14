import type { HistoryRunSummary, Order, Quote, Run, ScanResult, Strategy } from "../shared/api/client";

export const sortQuotes = (rows: Quote[]): Quote[] => [...rows].sort((a, b) => a.symbol.localeCompare(b.symbol));

export const sortScanResults = (rows: ScanResult[]): ScanResult[] => [...rows].sort((a, b) => b.score - a.score);

export const sortOrders = (rows: Order[]): Order[] =>
  [...rows].sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));

export const sortStrategies = (rows: Strategy[]): Strategy[] => [...rows].sort((a, b) => a.name.localeCompare(b.name));

export const getActiveRun = (runs: Run[]): Run | null => runs.find((run) => run.status === "running") ?? null;

export const sortHistoryRuns = (rows: HistoryRunSummary[]): HistoryRunSummary[] =>
  [...rows].sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));

