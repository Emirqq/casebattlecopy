-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "balance" INTEGER NOT NULL DEFAULT 1000,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "weapon" TEXT,
    "imageUrl" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "rarity" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Case" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "itemCount" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "CaseItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "CaseItem_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CaseItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'case',
    "status" TEXT NOT NULL DEFAULT 'owned',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InventoryItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InventoryItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Opening" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "battleId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Opening_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Opening_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Opening_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Battle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mode" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "totalPrice" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "winnerSeat" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" DATETIME,
    "finishedAt" DATETIME
);

-- CreateTable
CREATE TABLE "BattleCase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "battleId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    CONSTRAINT "BattleCase_battleId_fkey" FOREIGN KEY ("battleId") REFERENCES "Battle" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BattleCase_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BattleSeat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "battleId" TEXT NOT NULL,
    "userId" TEXT,
    "seat" INTEGER NOT NULL,
    "isBot" BOOLEAN NOT NULL DEFAULT false,
    "total" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "BattleSeat_battleId_fkey" FOREIGN KEY ("battleId") REFERENCES "Battle" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BattleSeat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "meta" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Case_slug_key" ON "Case"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "CaseItem_caseId_itemId_key" ON "CaseItem"("caseId", "itemId");

-- CreateIndex
CREATE INDEX "InventoryItem_userId_status_idx" ON "InventoryItem"("userId", "status");

-- CreateIndex
CREATE INDEX "Opening_userId_idx" ON "Opening"("userId");

-- CreateIndex
CREATE INDEX "Opening_battleId_idx" ON "Opening"("battleId");

-- CreateIndex
CREATE INDEX "BattleCase_battleId_idx" ON "BattleCase"("battleId");

-- CreateIndex
CREATE UNIQUE INDEX "BattleSeat_battleId_seat_key" ON "BattleSeat"("battleId", "seat");

-- CreateIndex
CREATE INDEX "Transaction_userId_idx" ON "Transaction"("userId");
