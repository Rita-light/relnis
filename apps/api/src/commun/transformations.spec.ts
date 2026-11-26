import { courrielNormalise, sansEspacesAutour } from './transformations.js';

// @Transform appelle ces fonctions avec { value } : on fait pareil.
describe('transformations des DTO', () => {
  it('retire les espaces au début et à la fin', () => {
    expect(sansEspacesAutour({ value: '  Marie  ' })).toBe('Marie');
  });

  it('met le courriel en minuscules, sans espaces autour', () => {
    expect(courrielNormalise({ value: ' Marie@Exemple.CA ' })).toBe(
      'marie@exemple.ca',
    );
  });

  it('laisse intacte une valeur qui n’est pas du texte (la validation la refusera ensuite)', () => {
    expect(sansEspacesAutour({ value: 42 })).toBe(42);
    expect(courrielNormalise({ value: null })).toBeNull();
  });
});
