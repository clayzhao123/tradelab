import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { MemoryDb } from "../db/memory-db.js";
import type { PostgresClient } from "../db/postgres-client.js";
import type { Strategy } from "../domain/types.js";

export type StrategyCreateInput = {
  name: string;
  description: string;
  isEnabled: boolean;
  params: Record<string, unknown>;
};

export type StrategyUpdateInput = Partial<StrategyCreateInput>;

export interface StrategyRepository {
  list(): Promise<Strategy[]>;
  getById(id: string): Promise<Strategy | null>;
  findByName(name: string): Promise<Strategy | null>;
  create(input: StrategyCreateInput): Promise<Strategy>;
  update(id: string, input: StrategyUpdateInput): Promise<Strategy | null>;
  remove(id: string): Promise<boolean>;
}

const parseJsonObject = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }
  return {};
};

const toIso = (value: unknown): string => {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "string") {
    return value;
  }
  return new Date().toISOString();
};

type StrategyRow = {
  id: string;
  name: string;
  description: string;
  isEnabled: boolean;
  params: unknown;
  createdAt: unknown;
  updatedAt: unknown;
};

const mapRow = (row: StrategyRow): Strategy => ({
  id: row.id,
  name: row.name,
  description: row.description,
  isEnabled: Boolean(row.isEnabled),
  params: parseJsonObject(row.params),
  createdAt: toIso(row.createdAt),
  updatedAt: toIso(row.updatedAt),
});

const readStrategiesFile = async (filePath: string): Promise<Strategy[]> => {
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter((row): row is Partial<Strategy> => Boolean(row && typeof row === "object"))
      .map((row) => ({
        id: typeof row.id === "string" && row.id ? row.id : randomUUID(),
        name: typeof row.name === "string" ? row.name : "Untitled Strategy",
        description: typeof row.description === "string" ? row.description : "",
        isEnabled: Boolean(row.isEnabled),
        params: parseJsonObject(row.params),
        createdAt: toIso(row.createdAt),
        updatedAt: toIso(row.updatedAt),
      }));
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "ENOENT") {
      return [];
    }
    return [];
  }
};

const writeStrategiesFile = async (filePath: string, strategies: Strategy[]): Promise<void> => {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(strategies, null, 2), "utf8");
};

export class MemoryStrategyRepository implements StrategyRepository {
  constructor(private readonly db: MemoryDb) {}

  async list(): Promise<Strategy[]> {
    return this.db.read((tx) => tx.listStrategies());
  }

  async getById(id: string): Promise<Strategy | null> {
    return this.db.read((tx) => tx.getStrategyById(id));
  }

  async findByName(name: string): Promise<Strategy | null> {
    const normalized = name.trim().toLowerCase();
    if (!normalized) {
      return null;
    }
    return this.db.read((tx) => tx.listStrategies().find((row) => row.name.trim().toLowerCase() === normalized) ?? null);
  }

  async create(input: StrategyCreateInput): Promise<Strategy> {
    return this.db.withTransaction(async (tx) => tx.createStrategy(input));
  }

  async update(id: string, input: StrategyUpdateInput): Promise<Strategy | null> {
    return this.db.withTransaction(async (tx) => tx.updateStrategy(id, input));
  }

  async remove(id: string): Promise<boolean> {
    return this.db.withTransaction(async (tx) => tx.deleteStrategy(id));
  }
}

export class FileStrategyRepository implements StrategyRepository {
  constructor(private readonly filePath: string) {}

  async list(): Promise<Strategy[]> {
    const rows = await readStrategiesFile(this.filePath);
    return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getById(id: string): Promise<Strategy | null> {
    const rows = await readStrategiesFile(this.filePath);
    return rows.find((row) => row.id === id) ?? null;
  }

  async findByName(name: string): Promise<Strategy | null> {
    const normalized = name.trim().toLowerCase();
    if (!normalized) {
      return null;
    }
    const rows = await readStrategiesFile(this.filePath);
    return rows.find((row) => row.name.trim().toLowerCase() === normalized) ?? null;
  }

  async create(input: StrategyCreateInput): Promise<Strategy> {
    const rows = await readStrategiesFile(this.filePath);
    const timestamp = new Date().toISOString();
    const next: Strategy = {
      id: randomUUID(),
      name: input.name,
      description: input.description,
      isEnabled: input.isEnabled,
      params: input.params,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    rows.unshift(next);
    await writeStrategiesFile(this.filePath, rows);
    return next;
  }

  async update(id: string, input: StrategyUpdateInput): Promise<Strategy | null> {
    const rows = await readStrategiesFile(this.filePath);
    const index = rows.findIndex((row) => row.id === id);
    if (index < 0) {
      return null;
    }
    const updated: Strategy = {
      ...rows[index],
      ...input,
      params: input.params ?? rows[index].params,
      updatedAt: new Date().toISOString(),
    };
    rows[index] = updated;
    await writeStrategiesFile(this.filePath, rows);
    return updated;
  }

  async remove(id: string): Promise<boolean> {
    const rows = await readStrategiesFile(this.filePath);
    const next = rows.filter((row) => row.id !== id);
    if (next.length === rows.length) {
      return false;
    }
    await writeStrategiesFile(this.filePath, next);
    return true;
  }
}

export class PostgresStrategyRepository implements StrategyRepository {
  constructor(private readonly pg: PostgresClient) {}

  async list(): Promise<Strategy[]> {
    const result = await this.pg.query<StrategyRow>(
      `SELECT
        id,
        name,
        description,
        is_enabled AS "isEnabled",
        params,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM strategies
      ORDER BY created_at DESC`,
    );
    return result.rows.map(mapRow);
  }

  async getById(id: string): Promise<Strategy | null> {
    const result = await this.pg.query<StrategyRow>(
      `SELECT
        id,
        name,
        description,
        is_enabled AS "isEnabled",
        params,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM strategies
      WHERE id = $1
      LIMIT 1`,
      [id],
    );
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  async findByName(name: string): Promise<Strategy | null> {
    const result = await this.pg.query<StrategyRow>(
      `SELECT
        id,
        name,
        description,
        is_enabled AS "isEnabled",
        params,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM strategies
      WHERE lower(name) = lower($1)
      LIMIT 1`,
      [name.trim()],
    );
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  async create(input: StrategyCreateInput): Promise<Strategy> {
    const result = await this.pg.query<StrategyRow>(
      `INSERT INTO strategies (name, description, is_enabled, params)
      VALUES ($1, $2, $3, $4::jsonb)
      RETURNING
        id,
        name,
        description,
        is_enabled AS "isEnabled",
        params,
        created_at AS "createdAt",
        updated_at AS "updatedAt"`,
      [input.name, input.description, input.isEnabled, JSON.stringify(input.params ?? {})],
    );
    return mapRow(result.rows[0]);
  }

  async update(id: string, input: StrategyUpdateInput): Promise<Strategy | null> {
    const setClauses: string[] = [];
    const values: unknown[] = [];

    if (input.name !== undefined) {
      values.push(input.name);
      setClauses.push(`name = $${values.length}`);
    }
    if (input.description !== undefined) {
      values.push(input.description);
      setClauses.push(`description = $${values.length}`);
    }
    if (input.isEnabled !== undefined) {
      values.push(input.isEnabled);
      setClauses.push(`is_enabled = $${values.length}`);
    }
    if (input.params !== undefined) {
      values.push(JSON.stringify(input.params ?? {}));
      setClauses.push(`params = $${values.length}::jsonb`);
    }

    if (setClauses.length === 0) {
      return this.getById(id);
    }

    setClauses.push("updated_at = NOW()");
    values.push(id);

    const result = await this.pg.query<StrategyRow>(
      `UPDATE strategies
      SET ${setClauses.join(", ")}
      WHERE id = $${values.length}
      RETURNING
        id,
        name,
        description,
        is_enabled AS "isEnabled",
        params,
        created_at AS "createdAt",
        updated_at AS "updatedAt"`,
      values,
    );
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.pg.query<{ id: string }>(
      `DELETE FROM strategies
      WHERE id = $1
      RETURNING id`,
      [id],
    );
    return result.rows.length > 0;
  }
}
