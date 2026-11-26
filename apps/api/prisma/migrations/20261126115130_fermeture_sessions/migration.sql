/*
  Warnings:

  - A unique constraint covering the columns `[jeton_precedent_hache]` on the table `sessions` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "motif_fermeture" AS ENUM ('DECONNEXION', 'REUTILISATION_DETECTEE');

-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "fermee_le" TIMESTAMPTZ(3),
ADD COLUMN     "jeton_precedent_hache" CHAR(64),
ADD COLUMN     "motif_fermeture" "motif_fermeture",
ADD COLUMN     "renouvelee_le" TIMESTAMPTZ(3);

-- CreateIndex
CREATE UNIQUE INDEX "sessions_jeton_precedent_hache_key" ON "sessions"("jeton_precedent_hache");
