-- Développement local et CI UNIQUEMENT : ouvre la connexion des rôles créés par les migrations.
-- En production, chaque rôle reçoit un mot de passe fort, gardé hors de Git.
ALTER ROLE relnis_app LOGIN PASSWORD 'relnis_app_dev';
ALTER ROLE relnis_systeme LOGIN PASSWORD 'relnis_systeme_dev';
