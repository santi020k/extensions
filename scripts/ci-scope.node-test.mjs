import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { full, plan, selectPaths } from "./ci-scope.mjs";
import { verifyGate } from "./quality-gate.mjs";

test("only proven registry and documentation inputs select fewer checks", () => {
  assert.deepEqual(selectPaths(["README.md"]), {
    mode: "affected",
    tooling: false,
    registry: false,
  });
  for (const path of ["extensions.toml", ".gitmodules", "extensions/sample"]) {
    assert.deepEqual(selectPaths([path]), {
      mode: "affected",
      tooling: false,
      registry: true,
    });
  }
  for (const path of [
    "src/lib/validation.js",
    "pnpm-lock.yaml",
    "unknown",
    ".github/workflows/ci.yml",
  ])
    assert.deepEqual(selectPaths([path]), full());
});
test("missing history and release events broaden validation", () => {
  for (const env of [
    {},
    { EVENT_NAME: "push" },
    { EVENT_NAME: "pull_request", BASE_SHA: "missing-ref" },
    {
      EVENT_NAME: "pull_request",
      HEAD_REF: "release/v1.0.0",
      BASE_SHA: "HEAD",
    },
  ])
    assert.deepEqual(plan(env), full());
});
test("selected jobs cannot disappear or be skipped, failed or cancelled", () => {
  const success = {
    scope: {
      result: "success",
      outputs: { mode: "affected", tooling: "false", registry: "true" },
    },
    impact: { result: "success" },
    tooling: { result: "skipped" },
    registry: { result: "success" },
  };
  verifyGate(success);
  for (const result of ["skipped", "cancelled", "failure", undefined])
    assert.throws(() => verifyGate({ ...success, registry: { result } }));
  assert.throws(() =>
    verifyGate({ ...success, scope: { result: "success", outputs: {} } }),
  );
  assert.throws(() =>
    verifyGate({ ...success, impact: { result: "skipped" } }),
  );
  assert.throws(() =>
    verifyGate({
      ...success,
      scope: {
        result: "success",
        outputs: { ...success.scope.outputs, mode: "full" },
      },
    }),
  );
});

test("Git comparisons retain unusual names and both rename paths", () => {
  const cwd = mkdtempSync(join(tmpdir(), "registry-scope-"));
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_")),
  );
  /** @param {string[]} args */
  const git = (...args) =>
    execFileSync("git", args, {
      cwd,
      env,
      stdio: "pipe",
      encoding: "utf8",
    }).trim();
  try {
    git("init", "-q");
    git("config", "user.name", "Fixture");
    git("config", "user.email", "fixture@example.test");
    writeFileSync(join(cwd, "README.md"), "initial");
    git("add", ".");
    git("commit", "-qm", "initial");
    const base = git("rev-parse", "HEAD");
    git("mv", "README.md", " README.md");
    git("commit", "-qm", "rename");
    assert.deepEqual(
      plan({ ...env, EVENT_NAME: "pull_request", BASE_SHA: base }, cwd),
      full(),
    );
    const beforeDelete = git("rev-parse", "HEAD");
    git("rm", " README.md");
    git("commit", "-qm", "delete");
    assert.deepEqual(
      plan({ ...env, EVENT_NAME: "pull_request", BASE_SHA: beforeDelete }, cwd),
      full(),
    );
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
