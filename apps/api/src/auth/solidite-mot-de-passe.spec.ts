import { ErreurApi } from '../commun/erreur-api.js';
import {
  exigerMotDePasseSolide,
  indicesPersonnels,
  noteMotDePasse,
  SCORE_MINIMUM,
} from './solidite-mot-de-passe.js';

const indices = indicesPersonnels(
  'marie@plomberie-tremblay.ca',
  'Marie',
  'Tremblay',
  'Plomberie Tremblay',
);

describe('indicesPersonnels', () => {
  it('ajoute le nom du site et découpe les valeurs en morceaux utiles', () => {
    expect(indices).toEqual(
      expect.arrayContaining(['relnis', 'marie', 'tremblay', 'plomberie']),
    );
    expect(indices).not.toContain('ca'); // trop court pour servir d'indice
  });
});

describe('noteMotDePasse', () => {
  it.each([
    '1234567891011',
    'aaaaaaaaaaaa',
    'azertyuiopqs',
    'motdepasse123',
    'P@ssw0rd1234',
    'Motdepasse1!',
  ])('trouve « %s » trop facile à deviner', (motDePasse) => {
    expect(noteMotDePasse(motDePasse, indices)).toBeLessThan(SCORE_MINIMUM);
  });

  it('pénalise les infos personnelles', () => {
    expect(noteMotDePasse('Tremblay2026!', indices)).toBeLessThan(
      SCORE_MINIMUM,
    );
  });

  it.each([
    "J'aime les tuyaux PEX",
    'cheval-pile-agrafe-correct',
    'vK8#qz!Lw2pR',
  ])('accepte « %s »', (motDePasse) => {
    expect(noteMotDePasse(motDePasse, indices)).toBeGreaterThanOrEqual(
      SCORE_MINIMUM,
    );
  });
});

describe('exigerMotDePasseSolide', () => {
  it('lève MOT_DE_PASSE_TROP_FAIBLE (400) pour un mot de passe faible', () => {
    try {
      exigerMotDePasseSolide('1234567891011', indices);
      expect.unreachable();
    } catch (erreur) {
      expect(erreur).toBeInstanceOf(ErreurApi);
      expect((erreur as ErreurApi).getStatus()).toBe(400);
      expect((erreur as ErreurApi).code).toBe('MOT_DE_PASSE_TROP_FAIBLE');
    }
  });

  it('laisse passer un mot de passe solide', () => {
    expect(() =>
      exigerMotDePasseSolide('cheval-pile-agrafe-correct', indices),
    ).not.toThrow();
  });
});
