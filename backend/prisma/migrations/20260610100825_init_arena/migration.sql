-- CreateTable
CREATE TABLE "ArenaMatch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "templateId" TEXT,
    "prompt" TEXT NOT NULL,
    "modelA" "Provider" NOT NULL,
    "modelB" "Provider" NOT NULL,
    "generationAId" TEXT NOT NULL,
    "generationBId" TEXT NOT NULL,
    "winner" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArenaMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderStats" (
    "provider" "Provider" NOT NULL,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "ties" INTEGER NOT NULL DEFAULT 0,
    "eloRating" INTEGER NOT NULL DEFAULT 1200,
    "matchesPlayed" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderStats_pkey" PRIMARY KEY ("provider")
);

-- CreateIndex
CREATE UNIQUE INDEX "ArenaMatch_generationAId_key" ON "ArenaMatch"("generationAId");

-- CreateIndex
CREATE UNIQUE INDEX "ArenaMatch_generationBId_key" ON "ArenaMatch"("generationBId");

-- CreateIndex
CREATE INDEX "ArenaMatch_userId_idx" ON "ArenaMatch"("userId");

-- CreateIndex
CREATE INDEX "ArenaMatch_createdAt_idx" ON "ArenaMatch"("createdAt");

-- AddForeignKey
ALTER TABLE "ArenaMatch" ADD CONSTRAINT "ArenaMatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArenaMatch" ADD CONSTRAINT "ArenaMatch_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArenaMatch" ADD CONSTRAINT "ArenaMatch_generationAId_fkey" FOREIGN KEY ("generationAId") REFERENCES "Generation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArenaMatch" ADD CONSTRAINT "ArenaMatch_generationBId_fkey" FOREIGN KEY ("generationBId") REFERENCES "Generation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
