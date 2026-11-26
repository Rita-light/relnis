import { hacherJeton } from './hacher-jeton.js';

describe('hacherJeton', () => {
  it('donne toujours le même haché pour le même jeton (on peut le retrouver en base)', () => {
    expect(hacherJeton('abc')).toBe(hacherJeton('abc'));
  });

  it('donne des hachés différents pour des jetons différents', () => {
    expect(hacherJeton('abc')).not.toBe(hacherJeton('abd'));
  });

  it('produit 64 caractères hexadécimaux, sans jamais contenir le jeton', () => {
    const hache = hacherJeton('mon-jeton-secret');
    expect(hache).toMatch(/^[0-9a-f]{64}$/);
    expect(hache).not.toContain('mon-jeton-secret');
  });
});
