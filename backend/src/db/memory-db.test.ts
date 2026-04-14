import { test } from "node:test";
import assert from "node:assert/strict";
import { MemoryDb } from "./memory-db.js";

test("withTransaction rolls back when callback throws", async () => {
  const db = new MemoryDb();

  const before = await db.read((tx) => tx.listStrategies().length);

  await assert.rejects(async () => {
    await db.withTransaction(async (tx) => {
      tx.createStrategy({
        name: "Temp Strategy",
        description: "Should rollback",
        isEnabled: true,
        params: {},
      });
      throw new Error("force_rollback");
    });
  });

  const after = await db.read((tx) => tx.listStrategies().length);
  assert.equal(after, before);
});

