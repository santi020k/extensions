import { appendFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export const full = () => ({ mode: "full", tooling: true, registry: true });

/** @param {string[]} files */
export function selectPaths(files) {
  if (
    files.some(
      (file) =>
        file !== "README.md" &&
        file !== "extensions.toml" &&
        file !== ".gitmodules" &&
        !file.startsWith("extensions/"),
    )
  )
    return full();
  return {
    mode: "affected",
    tooling: false,
    registry: files.some((file) => file !== "README.md"),
  };
}

/**
 * @param {Record<string, string | undefined>} environment
 * @param {string} cwd
 */
export function plan(environment = process.env, cwd = process.cwd()) {
  const { EVENT_NAME, HEAD_REF = "", BASE_SHA } = environment;
  if (
    EVENT_NAME !== "pull_request" ||
    /^(release\/|changeset-release\/)/u.test(HEAD_REF) ||
    !BASE_SHA
  )
    return full();
  const env = Object.fromEntries(
    Object.entries(environment).filter(([key]) => !key.startsWith("GIT_")),
  );
  /** @param {string[]} args */
  const git = (args) =>
    execFileSync("git", args, { cwd, env, encoding: "utf8", stdio: "pipe" });
  try {
    const base = git(["merge-base", BASE_SHA, "HEAD"]).trim();
    return selectPaths(
      git(["diff", "--no-renames", "--name-only", "-z", base, "HEAD"])
        .split("\0")
        .filter(Boolean),
    );
  } catch {
    return full();
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const result = plan();
  if (!process.env["GITHUB_OUTPUT"]) throw new Error("Missing GITHUB_OUTPUT");
  for (const [key, value] of Object.entries(result))
    appendFileSync(process.env["GITHUB_OUTPUT"], `${key}=${value}\n`);
}
