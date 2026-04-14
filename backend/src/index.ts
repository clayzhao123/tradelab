import { createApp } from "./app/create-app.js";
import { env } from "./config/env.js";

const start = async (): Promise<void> => {
  const { app, shutdown } = await createApp();

  const closeSignals: NodeJS.Signals[] = ["SIGINT", "SIGTERM"];
  for (const signal of closeSignals) {
    process.on(signal, async () => {
      app.log.info({ signal }, "received shutdown signal");
      await shutdown();
      process.exit(0);
    });
  }

  try {
    await app.listen({ host: env.host, port: env.port });
    app.log.info({ wsPath: env.wsPath }, "server started");
  } catch (error) {
    app.log.error(error);
    await shutdown();
    process.exit(1);
  }
};

void start();
