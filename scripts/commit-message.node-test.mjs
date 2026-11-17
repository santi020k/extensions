import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

test("the installed Commitprompt accepts conventional messages and rejects invalid messages", () => {
  const directory = mkdtempSync(join(tmpdir(), "registry-commit-message-"));
  const file = join(directory, "message with spaces.txt");
  try {
    for (const { message, expected } of [
      { message: "ci: adopt quality v2\n", expected: 0 },
      { message: "not a conventional commit\n", expected: 1 },
    ]) {
      writeFileSync(file, message);
      const result = spawnSync(
        "pnpm",
        ["exec", "commitprompt", "validate", "--input", file, "--json"],
        { encoding: "utf8" },
      );
      assert.ifError(result.error);
      assert.equal(result.status, expected, result.stdout + result.stderr);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
