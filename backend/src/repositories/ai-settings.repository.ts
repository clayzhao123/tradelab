import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { PostgresClient } from "../db/postgres-client.js";
import type {
  AiConfigUpdateInput,
  AiProviderConfigPublic,
  AiProviderConfigStored,
} from "../modules/ai/ai.types.js";

const DEFAULT_PROVIDER = "minimax" as const;
const DEFAULT_MODEL = "MiniMax-M2.7";

const toIso = (value: unknown): string => {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "string") {
    return value;
  }
  return new Date().toISOString();
};

/** 固定长度的遮罩，避免 JWT 类长 Key 在 UI 上撑破一行 */
const maskApiKey = (apiKey: string): string | null => {
  const trimmed = apiKey.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.length <= 4) {
    return "•".repeat(trimmed.length);
  }
  return `••••••••…${trimmed.slice(-4)}`;
};

const toPublic = (stored: AiProviderConfigStored | null): AiProviderConfigPublic => ({
  provider: stored?.provider ?? DEFAULT_PROVIDER,
  model: stored?.model ?? DEFAULT_MODEL,
  hasApiKey: Boolean(stored?.apiKey.trim()),
  apiKeyMasked: stored ? maskApiKey(stored.apiKey) : null,
  createdAt: stored?.createdAt ?? null,
  updatedAt: stored?.updatedAt ?? null,
});

export interface AiSettingsRepository {
  getStored(): Promise<AiProviderConfigStored | null>;
  getPublic(): Promise<AiProviderConfigPublic>;
  upsert(input: AiConfigUpdateInput): Promise<AiProviderConfigPublic>;
}

export class MemoryAiSettingsRepository implements AiSettingsRepository {
  private config: AiProviderConfigStored | null = null;

  async getStored(): Promise<AiProviderConfigStored | null> {
    return this.config ? { ...this.config } : null;
  }

  async getPublic(): Promise<AiProviderConfigPublic> {
    return toPublic(this.config);
  }

  async upsert(input: AiConfigUpdateInput): Promise<AiProviderConfigPublic> {
    const now = new Date().toISOString();
    const existing = this.config;
    const next: AiProviderConfigStored = {
      provider: DEFAULT_PROVIDER,
      model: input.model,
      apiKey:
        input.apiKey !== undefined && input.apiKey.trim().length > 0
          ? input.apiKey.trim()
          : (existing?.apiKey ?? ""),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    this.config = next;
    return toPublic(next);
  }
}

export class FileAiSettingsRepository implements AiSettingsRepository {
  constructor(private readonly filePath: string) {}

  private async readStored(): Promise<AiProviderConfigStored | null> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as Partial<AiProviderConfigStored>;
      if (!parsed || typeof parsed !== "object") {
        return null;
      }
      return {
        provider: DEFAULT_PROVIDER,
        model: typeof parsed.model === "string" && parsed.model.trim().length > 0 ? parsed.model : DEFAULT_MODEL,
        apiKey: typeof parsed.apiKey === "string" ? parsed.apiKey : "",
        createdAt: typeof parsed.createdAt === "string" ? parsed.createdAt : new Date().toISOString(),
        updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
      };
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "ENOENT") {
        return null;
      }
      return null;
    }
  }

  private async writeStored(stored: AiProviderConfigStored): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(stored, null, 2), "utf8");
  }

  async getStored(): Promise<AiProviderConfigStored | null> {
    return this.readStored();
  }

  async getPublic(): Promise<AiProviderConfigPublic> {
    return toPublic(await this.readStored());
  }

  async upsert(input: AiConfigUpdateInput): Promise<AiProviderConfigPublic> {
    const existing = await this.readStored();
    const now = new Date().toISOString();
    const next: AiProviderConfigStored = {
      provider: DEFAULT_PROVIDER,
      model: input.model,
      apiKey:
        input.apiKey !== undefined && input.apiKey.trim().length > 0
          ? input.apiKey.trim()
          : (existing?.apiKey ?? ""),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    await this.writeStored(next);
    return toPublic(next);
  }
}

type ConfigRow = {
  provider: string;
  apiKey: string;
  model: string;
  createdAt: unknown;
  updatedAt: unknown;
};

const mapRow = (row: ConfigRow): AiProviderConfigStored => ({
  provider: DEFAULT_PROVIDER,
  apiKey: row.apiKey ?? "",
  model: row.model ?? DEFAULT_MODEL,
  createdAt: toIso(row.createdAt),
  updatedAt: toIso(row.updatedAt),
});

export class PostgresAiSettingsRepository implements AiSettingsRepository {
  constructor(private readonly pg: PostgresClient) {}

  async getStored(): Promise<AiProviderConfigStored | null> {
    const result = await this.pg.query<ConfigRow>(
      `SELECT
        provider,
        api_key AS "apiKey",
        model,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM ai_provider_settings
      WHERE provider = $1
      LIMIT 1`,
      [DEFAULT_PROVIDER],
    );
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  async getPublic(): Promise<AiProviderConfigPublic> {
    const stored = await this.getStored();
    return toPublic(stored);
  }

  async upsert(input: AiConfigUpdateInput): Promise<AiProviderConfigPublic> {
    const current = await this.getStored();
    const nextApiKey =
      input.apiKey !== undefined && input.apiKey.trim().length > 0
        ? input.apiKey.trim()
        : (current?.apiKey ?? "");

    const result = await this.pg.query<ConfigRow>(
      `INSERT INTO ai_provider_settings (provider, api_key, model)
      VALUES ($1, $2, $3)
      ON CONFLICT (provider)
      DO UPDATE SET
        api_key = EXCLUDED.api_key,
        model = EXCLUDED.model,
        updated_at = NOW()
      RETURNING
        provider,
        api_key AS "apiKey",
        model,
        created_at AS "createdAt",
        updated_at AS "updatedAt"`,
      [DEFAULT_PROVIDER, nextApiKey, input.model],
    );
    return toPublic(mapRow(result.rows[0]));
  }
}
