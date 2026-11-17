import { readTomlFile } from "../src/lib/fs.js";
import { readGitmodules } from "../src/lib/git.js";
import {
  validateExtensionsToml,
  validateGitmodules,
  validateGitmodulesLocations,
} from "../src/lib/validation.js";

const [extensions, modules] = await Promise.all([
  readTomlFile("extensions.toml"),
  readGitmodules(".gitmodules"),
]);
validateExtensionsToml(extensions);
validateGitmodules(modules);
validateGitmodulesLocations(extensions, modules);
console.log("Registry declarations and submodule locations are valid.");
