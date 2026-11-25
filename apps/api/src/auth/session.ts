import type { Response } from 'express';
import type { Role } from '../generated/prisma/client.js';

// Durées de la conception (API, décision 3) : un seul endroit pour les changer.
export const DUREE_ACCES_SECONDES = 15 * 60; // jeton d'accès : 15 min
export const DUREE_INACTIVITE_MS = 7 * 24 * 3_600_000; // session : 7 jours sans activité
export const DUREE_ABSOLUE_MS = 30 * 24 * 3_600_000; // session : 30 jours au maximum

export const COOKIE_ACCES = 'relnis_acces';
export const COOKIE_RENOUVELLEMENT = 'relnis_renouvellement';

/** Ce que contient le jeton d'accès (JWT signé par l'API). */
export interface ChargeJetonAcces {
  sub: string; // id de l'utilisateur
  ent: string; // id de l'entreprise
  role: Role;
  sid: string; // id de la session
}

/** La personne connectée, attachée à la requête par le garde. */
export interface UtilisateurConnecte {
  id: string;
  entrepriseId: string;
  role: Role;
  sessionId: string;
}

// Ajoute « utilisateur » au type de la requête Express.
declare module 'express-serve-static-core' {
  interface Request {
    utilisateur?: UtilisateurConnecte;
  }
}

/**
 * Pose les deux cookies de session.
 * httpOnly : illisibles par le JavaScript de la page (protège du vol par un script piégé).
 * SameSite strict : jamais envoyés depuis un autre site (protège du CSRF).
 * Secure en production : envoyés seulement en HTTPS.
 */
export function poserCookiesSession(
  reponse: Response,
  jetons: { acces: string; renouvellement: string },
) {
  const commun = {
    httpOnly: true,
    sameSite: 'strict' as const,
    secure: process.env.NODE_ENV === 'production',
  };
  reponse.cookie(COOKIE_ACCES, jetons.acces, {
    ...commun,
    path: '/api',
    maxAge: DUREE_ACCES_SECONDES * 1000,
  });
  // Envoyé seulement aux routes d'authentification, où il sert à renouveler l'accès.
  reponse.cookie(COOKIE_RENOUVELLEMENT, jetons.renouvellement, {
    ...commun,
    path: '/api/v1/auth',
    maxAge: DUREE_INACTIVITE_MS,
  });
}
