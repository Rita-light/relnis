-- CreateEnum
CREATE TYPE "type_jeton" AS ENUM ('VERIFICATION_COURRIEL');

-- CreateTable
CREATE TABLE "jetons" (
    "id" UUID NOT NULL,
    "utilisateur_id" UUID NOT NULL,
    "type" "type_jeton" NOT NULL,
    "jeton_hache" CHAR(64) NOT NULL,
    "expire_le" TIMESTAMPTZ(3) NOT NULL,
    "utilise_le" TIMESTAMPTZ(3),
    "cree_le" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jetons_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "jetons_jeton_hache_key" ON "jetons"("jeton_hache");

-- CreateIndex
CREATE INDEX "jetons_utilisateur_id_idx" ON "jetons"("utilisateur_id");

-- AddForeignKey
ALTER TABLE "jetons" ADD CONSTRAINT "jetons_utilisateur_id_fkey" FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
