import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ErreurApi } from '../commun/erreur-api.js';
import { GardeConnexion } from './garde-connexion.js';

// Un vrai JwtService, avec une clé de test : on teste la vraie vérification de signature.
const jwt = new JwtService({ secret: 'cle-de-test', signOptions: { expiresIn: 900 } });
const charge = { sub: 'u1', ent: 'e1', role: 'EMPLOYE', sid: 's1' };

// Simulation du contexte d'une requête, avec ses cookies.
const simulerContexte = (cookies: Record<string, string> = {}) => {
  const requete: { cookies: Record<string, string>; utilisateur?: unknown } = { cookies };
  const contexte = {
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => requete }),
  } as unknown as ExecutionContext;
  return { requete, contexte };
};

const creerGarde = (publique: boolean) => {
  const reflector = { getAllAndOverride: () => publique } as unknown as Reflector;
  return new GardeConnexion(reflector, jwt);
};

// Vérifie que la promesse échoue avec 401 NON_AUTHENTIFIE.
const attendreRefus = async (promesse: Promise<unknown>) => {
  const erreur = await promesse.catch((e: unknown) => e);
  expect(erreur).toBeInstanceOf(ErreurApi);
  expect((erreur as ErreurApi).getStatus()).toBe(401);
  expect((erreur as ErreurApi).code).toBe('NON_AUTHENTIFIE');
};

describe('GardeConnexion', () => {
  it('laisse passer une route @Publique() sans cookie', async () => {
    const { contexte } = simulerContexte();
    await expect(creerGarde(true).canActivate(contexte)).resolves.toBe(true);
  });

  it('refuse une route protégée sans cookie', async () => {
    const { contexte } = simulerContexte();
    await attendreRefus(creerGarde(false).canActivate(contexte));
  });

  it('refuse un jeton falsifié', async () => {
    const { contexte } = simulerContexte({ relnis_acces: 'un.jeton.invente' });
    await attendreRefus(creerGarde(false).canActivate(contexte));
  });

  it('refuse un jeton signé avec une autre clé', async () => {
    const autreCle = new JwtService({ secret: 'autre-cle' });
    const { contexte } = simulerContexte({
      relnis_acces: await autreCle.signAsync(charge),
    });
    await attendreRefus(creerGarde(false).canActivate(contexte));
  });

  it('refuse un jeton expiré', async () => {
    // Même clé, mais une date d'expiration déjà passée (depuis une minute).
    const sansDureeParDefaut = new JwtService({ secret: 'cle-de-test' });
    const expire = await sansDureeParDefaut.signAsync({
      ...charge,
      exp: Math.floor(Date.now() / 1000) - 60,
    });
    const { contexte } = simulerContexte({ relnis_acces: expire });
    await attendreRefus(creerGarde(false).canActivate(contexte));
  });

  it('accepte un bon jeton et attache la personne connectée à la requête', async () => {
    const { requete, contexte } = simulerContexte({
      relnis_acces: await jwt.signAsync(charge),
    });
    await expect(creerGarde(false).canActivate(contexte)).resolves.toBe(true);
    expect(requete.utilisateur).toEqual({
      id: 'u1',
      entrepriseId: 'e1',
      role: 'EMPLOYE',
      sessionId: 's1',
    });
  });
});
