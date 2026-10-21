import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// SQL against the linked dev project through the Supabase CLI (as in
// scripts/db-test.mjs), for test setup and cleanup only. Returns the rows of
// the last statement.
export function sql<Row = Record<string, unknown>>(query: string): Row[] {
  const dir = mkdtempSync(join(tmpdir(), "findly-e2e-"));
  const file = join(dir, "query.sql");
  writeFileSync(file, query);
  try {
    // One command string: `npx` needs a shell on Windows, and Node warns
    // about separate arguments with `shell: true` (DEP0190).
    const result = spawnSync(
      `npx supabase db query --linked --file "${file}"`,
      { encoding: "utf8", shell: true },
    );
    if (result.status !== 0) {
      throw new Error(
        `SQL failed: ${result.stdout}\n${result.stderr}`.slice(0, 2000),
      );
    }
    const start = result.stdout.indexOf("{");
    if (start === -1) return [];
    const { rows } = JSON.parse(result.stdout.slice(start)) as {
      rows?: Row[];
    };
    return rows ?? [];
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// A SQL string literal.
export function literal(value: string) {
  return `'${value.replaceAll("'", "''")}'`;
}
