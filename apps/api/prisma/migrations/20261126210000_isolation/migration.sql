-- Isolation entre entreprises (RLS) : relnis_app ne voit que l'entreprise choisie pour la transaction
-- (PrismaService.avecEntreprise). Aucune entreprise choisie : aucune ligne (fermé par défaut).

-- L'entreprise de la transaction, ou NULL (NULL n'est égal à rien : aucune ligne ne passe).
CREATE FUNCTION entreprise_courante() RETURNS uuid
  LANGUAGE sql STABLE
  AS $$ SELECT NULLIF(current_setting('app.entreprise_id', true), '')::uuid $$;

-- FORCE : la règle vaut aussi pour le propriétaire des tables (seul un superutilisateur ou BYPASSRLS y échappe).
ALTER TABLE entreprises ENABLE ROW LEVEL SECURITY;
ALTER TABLE entreprises FORCE ROW LEVEL SECURITY;
CREATE POLICY isolation_entreprise ON entreprises
  USING (id = entreprise_courante())
  WITH CHECK (id = entreprise_courante());

ALTER TABLE utilisateurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE utilisateurs FORCE ROW LEVEL SECURITY;
CREATE POLICY isolation_entreprise ON utilisateurs
  USING (entreprise_id = entreprise_courante())
  WITH CHECK (entreprise_id = entreprise_courante());
