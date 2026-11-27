-- Rôles de connexion de l'API (moindre privilège). Le propriétaire (celui qui migre) garde seul le droit de créer les tables.
-- Sans mot de passe ici : chaque environnement ouvre la connexion avec le sien (prisma/roles-dev.sql en local et en CI).
DO $$
BEGIN
  -- Toute l'API : soumis à l'isolation entre entreprises (RLS).
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'relnis_app') THEN
    CREATE ROLE relnis_app NOLOGIN NOSUPERUSER NOBYPASSRLS;
  END IF;
  -- Authentification seulement : agit avant de connaître l'entreprise (connexion par courriel, inscription).
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'relnis_systeme') THEN
    CREATE ROLE relnis_systeme NOLOGIN NOSUPERUSER BYPASSRLS;
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO relnis_app, relnis_systeme;

-- Aucun DELETE : rien ne se supprime, on archive.
GRANT SELECT, INSERT, UPDATE ON entreprises, utilisateurs TO relnis_app;
-- Jetons et sessions : réservés à l'authentification.
GRANT SELECT, INSERT, UPDATE ON entreprises, utilisateurs, jetons, sessions TO relnis_systeme;
