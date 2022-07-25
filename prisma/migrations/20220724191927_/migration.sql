-- CreateTable
CREATE TABLE "StarboardReaction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "message_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "StarboardMessage" (
    "embed_id" TEXT NOT NULL PRIMARY KEY,
    "message_id" TEXT NOT NULL
);
