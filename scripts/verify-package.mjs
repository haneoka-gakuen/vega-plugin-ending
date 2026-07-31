import { readFile } from "node:fs/promises";

const manifest = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8"),
);

if (!manifest.repository?.url?.endsWith("/vega-plugin-ending.git")) {
  throw new Error("package repository must point to the ending plugin");
}
if (
  manifest.publishConfig?.access !== "public" ||
  manifest.publishConfig?.provenance !== true
) {
  throw new Error("public provenance publishing is required");
}
if (!manifest.vega?.capabilities?.includes("ui-slot")) {
  throw new Error("ui-slot capability metadata is required");
}

process.stdout.write("Vega ending plugin package boundary verified\n");
