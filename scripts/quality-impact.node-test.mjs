import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { isRecord } from "./quality-gate.mjs";

const gitEnvironment = () =>
  Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_")),
  );

test("Quality v2 plans transitive consumers and conservative fallbacks", () => {
  const cwd = mkdtempSync(join(tmpdir(), "extensions-quality-v2-"));
  const env = gitEnvironment();
  /** @param {string[]} args */
  const git = (...args) =>
    execFileSync("git", args, { cwd, env, stdio: "pipe" }).toString().trim();

  /** @param {string} path */
  const write = (path) => {
    mkdirSync(dirname(join(cwd, path)), { recursive: true });

    writeFileSync(join(cwd, path), "fixture\n");
  };

  /** @param {string} base */
  const plan = (base) => {
    /** @type {unknown} */
    const value = JSON.parse(
      execFileSync(
        process.env["QUALITY_BINARY"] || "quality",
        [
          "impact",
          "plan",
          "--base",
          base,
          "--head",
          "HEAD",
          "--format",
          "json",
        ],
        { cwd, env, encoding: "utf8" },
      ),
    );
    assert.ok(isRecord(value));
    assert.ok(Array.isArray(value["selected"]));
    /** @type {unknown[]} */
    const selected = value["selected"];
    return selected.map((node) => {
      assert.ok(isRecord(node));
      assert.ok(typeof node["id"] === "string");
      return node["id"];
    });
  };

  try {
    git("init", "-q");

    git("config", "user.name", "CI fixture");

    git("config", "user.email", "ci@example.test");

    copyFileSync(
      new URL("../quality-impact.json", import.meta.url),
      join(cwd, "quality-impact.json"),
    );

    git("add", ".");

    git("commit", "-qm", "initial policy");

    /** @type {[string, string[]][]} */
    const cases = [
      ["src/lib/validation.js", ["registry", "tooling"]],
      ["extensions.toml", ["registry", "tooling"]],
      ["pnpm-lock.yaml", ["registry", "tooling"]],
      ["unknown.txt", ["registry", "tooling"]],
    ];
    for (const [path, expected] of cases) {
      const base = git("rev-parse", "HEAD");

      write(path);

      git("add", ".");

      git("commit", "-qm", "change fixture");

      assert.deepEqual(plan(base).sort(), expected, path);
    }

    assert.equal(plan("missing-ref").length, 2);

    const base = git("rev-parse", "HEAD");

    git("rm", "src/lib/validation.js");

    git("commit", "-qm", "delete shared source");

    assert.equal(plan(base).length, 2);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
