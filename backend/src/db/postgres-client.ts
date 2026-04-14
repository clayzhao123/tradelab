import type { FastifyBaseLogger } from "fastify";

type Queryable = {
  query: <T extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    values?: unknown[],
  ) => Promise<{ rows: T[] }>;
};

export type PostgresClient = Queryable & {
  withTransaction: <T>(fn: (tx: Queryable) => Promise<T>) => Promise<T>;
  close: () => Promise<void>;
};

type PoolLike = {
  query: Queryable["query"];
  connect: () => Promise<{
    query: Queryable["query"];
    release: () => void;
  }>;
  end: () => Promise<void>;
};

type PoolCtor = new (options: { connectionString: string }) => PoolLike;

const normalizePoolCtor = (loaded: unknown): PoolCtor | null => {
  if (!loaded || typeof loaded !== "object") {
    return null;
  }
  const maybe = loaded as {
    Pool?: unknown;
    default?: {
      Pool?: unknown;
    };
  };
  const ctor = maybe.Pool ?? maybe.default?.Pool;
  return typeof ctor === "function" ? (ctor as PoolCtor) : null;
};

const createQueryable = (pool: PoolLike): Queryable => ({
  query: (text, values) => pool.query(text, values),
});

const createClientQueryable = (client: { query: Queryable["query"] }): Queryable => ({
  query: (text, values) => client.query(text, values),
});

const normalizePool = (ctor: PoolCtor, connectionString: string): PoolLike =>
  new ctor({ connectionString });

const normalizeClient = (pool: PoolLike): Promise<{
  query: Queryable["query"];
  connect: () => Promise<{
    query: Queryable["query"];
    release: () => void;
  }>;
  end: () => Promise<void>;
}> => Promise.resolve(pool);

export const createOptionalPostgresClient = async (
  databaseUrl: string,
  logger: FastifyBaseLogger,
): Promise<PostgresClient | null> => {
  const trimmed = databaseUrl.trim();
  if (!trimmed) {
    logger.warn("DATABASE_URL not configured; persistence repositories will use in-memory fallback");
    return null;
  }

  try {
    const moduleName = "pg";
    const pgModule = await import(moduleName);
    const Pool = normalizePoolCtor(pgModule);
    if (!Pool) {
      logger.warn("pg module loaded but Pool constructor not found; falling back to in-memory repositories");
      return null;
    }

    const pool = normalizePool(Pool, trimmed);
    await pool.query("select 1 as ok");

    logger.info("postgres connection established");

    return {
      ...createQueryable(pool),
      withTransaction: async <T>(fn: (tx: Queryable) => Promise<T>): Promise<T> => {
        const client = await (await normalizeClient(pool)).connect();
        try {
          await client.query("BEGIN");
          const result = await fn(createClientQueryable(client));
          await client.query("COMMIT");
          return result;
        } catch (error) {
          await client.query("ROLLBACK");
          throw error;
        } finally {
          client.release();
        }
      },
      close: async () => {
        await pool.end();
      },
    };
  } catch (error) {
    logger.warn(
      {
        error,
      },
      "unable to initialize postgres client; falling back to in-memory repositories",
    );
    return null;
  }
};
