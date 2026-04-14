import { createBrowserRouter } from "react-router";
import { RootLayout } from "./layouts/RootLayout";
import { Dashboard } from "./pages/Dashboard";
import { Strategy } from "./pages/Strategy";
import { Backtest } from "./pages/Backtest";
import { BotRunner } from "./pages/BotRunner";
import { History } from "./pages/History";
import { Orders } from "./pages/Orders";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    children: [
      { index: true, Component: Dashboard },
      { path: "orders", Component: Orders },
      { path: "strategy", Component: Strategy },
      { path: "backtest", Component: Backtest },
      { path: "runner", Component: BotRunner },
      { path: "history", Component: History },
    ],
  },
]);
