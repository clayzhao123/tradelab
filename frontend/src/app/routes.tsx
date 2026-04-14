import { createBrowserRouter } from "react-router";
import { RootLayout } from "./layouts/RootLayout";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    children: [
      {
        index: true,
        lazy: async () => ({ Component: (await import("./pages/Dashboard")).Dashboard }),
      },
      {
        path: "orders",
        lazy: async () => ({ Component: (await import("./pages/Orders")).Orders }),
      },
      {
        path: "strategy",
        lazy: async () => ({ Component: (await import("./pages/Strategy")).Strategy }),
      },
      {
        path: "backtest",
        lazy: async () => ({ Component: (await import("./pages/Backtest")).Backtest }),
      },
      {
        path: "runner",
        lazy: async () => ({ Component: (await import("./pages/BotRunner")).BotRunner }),
      },
      {
        path: "history",
        lazy: async () => ({ Component: (await import("./pages/History")).History }),
      },
    ],
  },
]);
