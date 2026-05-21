import { createClient } from "@libsql/client";
import * as fs from "fs";
import * as path from "path";

const url       = process.env.DATABASE_URL!;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) { console.error("DATABASE_URL manquant"); process.exit(1); }

const client = createClient({ url, authToken });

const MIGRATIONS_DIR = path.join(__dirname, "..", "prisma", "migrations");

function parseStatements(sql: string): string[] {
  // Strip comment lines, then split on ";"
  const stripped = sql
    .split("\n")
    .filter(line => !line.trim().startsWith("--"))
    .join("\n");

  return stripped
    .split(";")
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

async function run() {
  const dirs = fs.readdirSync(MIGRATIONS_DIR)
    .filter(d => fs.statSync(path.join(MIGRATIONS_DIR, d)).isDirectory())
    .sort();

  for (const dir of dirs) {
    const sqlFile = path.join(MIGRATIONS_DIR, dir, "migration.sql");
    if (!fs.existsSync(sqlFile)) continue;

    const sql = fs.readFileSync(sqlFile, "utf-8");
    console.log(`→ Migration: ${dir}`);

    const statements = parseStatements(sql);
    let ok = 0, skip = 0, err = 0;

    for (const stmt of statements) {
      try {
        await client.execute(stmt);
        ok++;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("already exists") || msg.includes("duplicate")) {
          skip++;
        } else {
          err++;
          console.error(`  ✗ ${msg.slice(0, 100)}`);
          console.error(`    > ${stmt.slice(0, 80)}`);
        }
      }
    }
    console.log(`  ✓ ok:${ok}  ignorés:${skip}  erreurs:${err}`);
  }

  console.log("\n✅ Migrations terminées.");
}

run().catch(console.error);
