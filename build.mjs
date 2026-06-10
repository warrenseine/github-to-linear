import * as esbuild from "esbuild";
import { cpSync, mkdirSync } from "node:fs";

const watch = process.argv.includes("--watch");

const options = {
  entryPoints: [
    "src/github.ts",
    "src/linear.ts",
    "src/background.ts",
    "src/options.ts",
  ],
  outdir: "dist",
  bundle: true,
  format: "iife",
  target: "chrome120",
  sourcemap: false,
  logLevel: "info",
};

function copyStatic() {
  mkdirSync("dist/icons", { recursive: true });
  cpSync("manifest.json", "dist/manifest.json");
  cpSync("src/options.html", "dist/options.html");
  for (const size of [16, 48, 128]) {
    cpSync(`icons/icon${size}.png`, `dist/icons/icon${size}.png`);
  }
}

copyStatic();

if (watch) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
} else {
  await esbuild.build(options);
}
