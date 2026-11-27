import { HttpStatus } from '@nestjs/common';
import { ZxcvbnFactory } from '@zxcvbn-ts/core';
import * as commun from '@zxcvbn-ts/language-common';
import * as en from '@zxcvbn-ts/language-en';
import * as fr from '@zxcvbn-ts/language-fr';
import { ErreurApi } from '../commun/erreur-api.js';

/** Note minimale de 0 à 4 (zxcvbn) : 3 = difficile à deviner, recommandé avec un hachage lent (Argon2). */
export const SCORE_MINIMUM = 3;

// Créé au premier usage : préparer les dictionnaires prend environ 100 ms.
let evaluateur: ZxcvbnFactory | undefined;
const zxcvbn = () =>
  (evaluateur ??= new ZxcvbnFactory({
    dictionary: { ...commun.dictionary, ...fr.dictionary, ...en.dictionary },
    graphs: commun.adjacencyGraphs, // suites de clavier : azerty, qwerty…
    useLevenshteinDistance: true, // repère aussi les mots courants légèrement modifiés
  }));

/** Ce que la personne pourrait réutiliser : nom du site, ses noms, son courriel, son entreprise (et leurs morceaux). */
export function indicesPersonnels(...valeurs: string[]): string[] {
  const morceaux = valeurs.flatMap((v) => [v, ...v.split(/[^\p{L}\p{N}]+/u)]);
  const utiles = morceaux
    .map((m) => m.toLowerCase())
    .filter((m) => m.length >= 3);
  return [...new Set(['relnis', ...utiles])];
}

/** La note du mot de passe, de 0 (deviné tout de suite) à 4 (très difficile). */
export const noteMotDePasse = (motDePasse: string, indices: string[]) =>
  zxcvbn().check(motDePasse, indices).score;

/** Refuse un mot de passe facile à deviner : suites, mots courants, infos personnelles. */
export function exigerMotDePasseSolide(motDePasse: string, indices: string[]) {
  if (noteMotDePasse(motDePasse, indices) < SCORE_MINIMUM) {
    throw new ErreurApi(
      HttpStatus.BAD_REQUEST,
      'MOT_DE_PASSE_TROP_FAIBLE',
      'Mot de passe trop facile à deviner',
    );
  }
}
