// Runs the SQL tests in supabase/tests against the linked Supabase project.
//
// Each test file is prefixed with _helpers.sql and wrapped in
// "begin; ... rollback;", so no test data is ever committed. A failing
// "assert" aborts the file and the error message is printed.
//
// Usage: npm run db:test [-- <name>]   e.g. npm run db:test -- profiles

import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const testsDir = join(import.meta.dirname, "..", "supabase", "tests");
const helpers = readFileSync(join(testsDir, "_helpers.sql"), "utf8");
const only = process.argv[2];

const files = readdirSync(testsDir)
  .filter((file) => file.endsWith(".sql") && !file.startsWith("_"))
  .filter((file) => !only || file === `${only}.sql`)
  .sort();

if (files.length === 0) {
  console.error(only ? `No test file named ${only}.sql` : "No SQL tests found");
  process.exit(1);
}

const workDir = mkdtempSync(join(tmpdir(), "findly-db-test-"));
let failed = 0;

for (const file of files) {
  const sql = readFileSync(join(testsDir, file), "utf8");
  const wrapped = join(workDir, file);
  writeFileSync(wrapped, `begin;\n${helpers}\n${sql}\nrollback;\n`);

  const result = spawnSync(
    "npx",
    ["supabase", "db", "query", "--linked", "--file", wrapped],
    { encoding: "utf8", shell: true },
  );

  if (result.status === 0) {
    console.log(`PASS  ${file}`);
  } else {
    failed++;
    const output = `${result.stdout}\n${result.stderr}`;
    // Show the database error (e.g. the failed assert message) if present.
    const match = output.match(/ERROR:\s+[^"\\]*/);
    console.log(`FAIL  ${file}`);
    console.log(`      ${match ? match[0] : output.trim()}`);
  }
}

console.log(`\n${files.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
