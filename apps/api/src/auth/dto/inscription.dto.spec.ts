import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { InscriptionDto } from './inscription.dto.js';

// Fait ce que fait ValidationPipe : nettoyer (@Transform), puis valider (@Is…).
const valider = async (donnees: object) => {
  const dto = plainToInstance(InscriptionDto, donnees);
  const erreurs = await validate(dto);
  // ex. { courriel: ['isEmail'] }
  const champs = Object.fromEntries(
    erreurs.map((e) => [e.property, Object.keys(e.constraints ?? {})]),
  );
  return { dto, champs };
};

const valides = {
  nomEntreprise: 'Plomberie Tremblay',
  prenom: 'Marie',
  nom: 'Tremblay',
  courriel: 'marie@exemple.ca',
  motDePasse: 'un-mot-de-passe-solide',
  accepteConditions: true,
};

describe('InscriptionDto', () => {
  it('accepte des données correctes', async () => {
    const { champs } = await valider(valides);
    expect(champs).toEqual({});
  });

  it('nettoie les espaces et met le courriel en minuscules', async () => {
    const { dto } = await valider({
      ...valides,
      prenom: '  Marie ',
      courriel: ' Marie@Exemple.CA ',
    });
    expect(dto.prenom).toBe('Marie');
    expect(dto.courriel).toBe('marie@exemple.ca');
  });

  it('refuse un nom d’entreprise fait seulement d’espaces', async () => {
    const { champs } = await valider({ ...valides, nomEntreprise: '   ' });
    expect(champs.nomEntreprise).toContain('isNotEmpty');
  });

  it('refuse un mot de passe de moins de 12 caractères', async () => {
    const { champs } = await valider({ ...valides, motDePasse: 'court' });
    expect(champs.motDePasse).toContain('minLength');
  });

  it('refuse un mot de passe de plus de 128 caractères', async () => {
    const { champs } = await valider({
      ...valides,
      motDePasse: 'x'.repeat(129),
    });
    expect(champs.motDePasse).toContain('maxLength');
  });

  it('refuse un courriel invalide', async () => {
    const { champs } = await valider({
      ...valides,
      courriel: 'pas-un-courriel',
    });
    expect(champs.courriel).toContain('isEmail');
  });

  it('exige que les conditions soient acceptées (true, pas seulement « présent »)', async () => {
    const { champs } = await valider({ ...valides, accepteConditions: false });
    expect(champs.accepteConditions).toContain('equals');
  });
});
