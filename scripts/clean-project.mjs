import { rm } from "node:fs/promises";

const targets = [".next", "out", ".turbo", "node_modules/.cache", "tsconfig.tsbuildinfo"];

for (const target of targets) {
  await rm(target, { recursive: true, force: true });
  console.log(`Removido: ${target}`);
}
