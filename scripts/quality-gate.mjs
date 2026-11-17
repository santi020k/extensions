import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

/** @param {unknown} value @returns {value is Record<string, unknown>} */
export const isRecord = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

/** @param {unknown} results */
export function verifyGate(results) {
  assert.ok(isRecord(results), "Missing job results");
  for (const [name, job] of Object.entries(results)) {
    assert.ok(isRecord(job), `Invalid ${name} result`);
    assert.ok(
      job["result"] === "success" || job["result"] === "skipped",
      `${name} failed or was cancelled`,
    );
  }
  const scope = results["scope"];
  const impact = results["impact"];
  assert.ok(isRecord(scope));
  assert.ok(isRecord(impact));
  assert.equal(scope["result"], "success");
  assert.equal(impact["result"], "success");
  const outputs = scope["outputs"];
  assert.ok(isRecord(outputs), "Missing selectors");
  assert.ok(outputs["mode"] === "full" || outputs["mode"] === "affected");
  for (const name of ["tooling", "registry"]) {
    assert.ok(
      outputs[name] === "true" || outputs[name] === "false",
      `Invalid ${name} selector`,
    );
    if (outputs["mode"] === "full" || outputs[name] === "true") {
      /** @type {unknown} */
      const job = results[name];
      assert.ok(isRecord(job), `Missing selected ${name}`);
      assert.equal(job["result"], "success", `${name} was selected`);
    }
  }
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  /** @type {unknown} */
  const results = JSON.parse(process.env["RESULTS"] ?? "{}");
  verifyGate(results);
}
