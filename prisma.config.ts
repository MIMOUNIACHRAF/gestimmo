import "dotenv/config";
import { createClient } from "@libsql/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // URL placeholder so Prisma CLI accepts SQLite provider — adapter handles the real connection
    url: "file:./placeholder.db",
    adapter: () => {
      const url       = process.env["DATABASE_URL"] ?? "file:./dev.db";
      const authToken = process.env["TURSO_AUTH_TOKEN"];
      const client    = createClient({ url, authToken });
      return new PrismaLibSql(client);
    },
  },
});
