-- CreateEnum
CREATE TYPE "AiFeedback" AS ENUM ('OTIMO', 'BOM', 'RUIM');

-- CreateTable
CREATE TABLE "AiInteraction" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "input" TEXT NOT NULL,
    "output" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "feedback" "AiFeedback",
    "feedbackText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiInteraction_clinicId_type_idx" ON "AiInteraction"("clinicId", "type");

-- CreateIndex
CREATE INDEX "AiInteraction_clinicId_createdAt_idx" ON "AiInteraction"("clinicId", "createdAt");

-- AddForeignKey
ALTER TABLE "AiInteraction" ADD CONSTRAINT "AiInteraction_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
