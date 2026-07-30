import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const projectRoot = process.cwd();

const obsoletePaths = [
  "src/app/api/cron/youtube-memberships",
  "src/app/api/youtube",
  "src/app/admin/youtube",
  "src/app/membros/youtube",
  "src/lib/google-oauth.ts",
  "src/lib/youtube-memberships.ts",
  "src/types/youtube-membership.ts",
  "CONFIGURACAO_GOOGLE.md",
];

let removed = 0;

for (const relativePath of obsoletePaths) {
  const absolutePath = resolve(projectRoot, relativePath);

  if (!existsSync(absolutePath)) {
    console.log(`- já ausente: ${relativePath}`);
    continue;
  }

  rmSync(absolutePath, { recursive: true, force: true });
  removed += 1;
  console.log(`✓ removido: ${relativePath}`);
}

console.log("");
console.log(`Limpeza concluída. ${removed} caminho(s) removido(s).`);
console.log("A reprodução de vídeos e o cron de novos vídeos foram preservados.");
