-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "utilisateur_id" UUID NOT NULL,
    "jeton_renouvellement_hache" CHAR(64) NOT NULL,
    "appareil" VARCHAR(255),
    "adresse_ip" VARCHAR(45),
    "derniere_activite_le" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expire_le" TIMESTAMPTZ(3) NOT NULL,
    "expire_absolu_le" TIMESTAMPTZ(3) NOT NULL,
    "cree_le" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sessions_jeton_renouvellement_hache_key" ON "sessions"("jeton_renouvellement_hache");

-- CreateIndex
CREATE INDEX "sessions_utilisateur_id_idx" ON "sessions"("utilisateur_id");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_utilisateur_id_fkey" FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
