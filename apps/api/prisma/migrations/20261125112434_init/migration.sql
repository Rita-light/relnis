-- CreateEnum
CREATE TYPE "role" AS ENUM ('ADMINISTRATEUR', 'GESTIONNAIRE', 'EMPLOYE', 'COMPTABLE');

-- CreateEnum
CREATE TYPE "theme" AS ENUM ('CLAIR', 'SOMBRE', 'SYSTEME');

-- CreateTable
CREATE TABLE "entreprises" (
    "id" UUID NOT NULL,
    "nom" VARCHAR(200) NOT NULL,
    "pays" CHAR(2) NOT NULL DEFAULT 'CA',
    "langue" VARCHAR(5) NOT NULL DEFAULT 'fr',
    "fuseau_horaire" VARCHAR(64) NOT NULL DEFAULT 'America/Toronto',
    "devise" CHAR(3) NOT NULL DEFAULT 'CAD',
    "cree_le" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifie_le" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "entreprises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "utilisateurs" (
    "id" UUID NOT NULL,
    "entreprise_id" UUID NOT NULL,
    "prenom" VARCHAR(100) NOT NULL,
    "nom" VARCHAR(100) NOT NULL,
    "courriel" VARCHAR(254) NOT NULL,
    "courriel_verifie" BOOLEAN NOT NULL DEFAULT false,
    "mot_de_passe_hache" TEXT NOT NULL,
    "role" "role" NOT NULL,
    "langue" VARCHAR(5) NOT NULL DEFAULT 'fr',
    "theme" "theme" NOT NULL DEFAULT 'SYSTEME',
    "acces_tous_emplacements" BOOLEAN NOT NULL DEFAULT true,
    "deux_fa_active" BOOLEAN NOT NULL DEFAULT false,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "derniere_connexion" TIMESTAMPTZ(3),
    "cree_le" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifie_le" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "utilisateurs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "utilisateurs_courriel_key" ON "utilisateurs"("courriel");

-- CreateIndex
CREATE INDEX "utilisateurs_entreprise_id_idx" ON "utilisateurs"("entreprise_id");

-- AddForeignKey
ALTER TABLE "utilisateurs" ADD CONSTRAINT "utilisateurs_entreprise_id_fkey" FOREIGN KEY ("entreprise_id") REFERENCES "entreprises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
