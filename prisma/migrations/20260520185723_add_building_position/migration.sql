-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Building" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "blocId" TEXT NOT NULL,
    CONSTRAINT "Building_blocId_fkey" FOREIGN KEY ("blocId") REFERENCES "Bloc" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Building" ("blocId", "id", "name") SELECT "blocId", "id", "name" FROM "Building";
DROP TABLE "Building";
ALTER TABLE "new_Building" RENAME TO "Building";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
