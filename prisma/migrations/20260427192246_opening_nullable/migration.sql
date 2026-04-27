-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Opening" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "caseId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "battleId" TEXT,
    "seat" INTEGER,
    "isBot" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Opening_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Opening_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Opening_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Opening" ("battleId", "caseId", "createdAt", "id", "itemId", "userId") SELECT "battleId", "caseId", "createdAt", "id", "itemId", "userId" FROM "Opening";
DROP TABLE "Opening";
ALTER TABLE "new_Opening" RENAME TO "Opening";
CREATE INDEX "Opening_userId_idx" ON "Opening"("userId");
CREATE INDEX "Opening_battleId_idx" ON "Opening"("battleId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
