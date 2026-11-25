// Nettoyages réutilisés par les DTO, avec @Transform(...).

/** Retire les espaces au début et à la fin. */
export const sansEspacesAutour = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/** Courriel sans espaces et en minuscules : Marie@… et marie@… sont la même adresse. */
export const courrielNormalise = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;
