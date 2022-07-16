/*
  Warnings:

  - You are about to drop the column `user_id` on the `Whitelist` table. All the data in the column will be lost.
  - Added the required column `whitelist_id` to the `Whitelist` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Whitelist" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" INTEGER NOT NULL,
    "whitelist_id" TEXT NOT NULL,
    "command_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Whitelist" ("command_id", "created_at", "id", "type") SELECT "command_id", "created_at", "id", "type" FROM "Whitelist";
DROP TABLE "Whitelist";
ALTER TABLE "new_Whitelist" RENAME TO "Whitelist";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
