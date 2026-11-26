import { ArgumentsHost, HttpStatus, Logger, NotFoundException } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { ErreurApi } from './erreur-api.js';
import { FiltreErreurs } from './filtre-erreurs.js';

// Simulation d'une réponse Express : on note le statut et le corps envoyés.
const simulerReponse = () => {
  const reponse = { status: vi.fn(), json: vi.fn() };
  reponse.status.mockReturnValue(reponse);
  const hote = {
    switchToHttp: () => ({ getResponse: () => reponse }),
  } as unknown as ArgumentsHost;
  return { reponse, hote };
};

describe('FiltreErreurs', () => {
  const filtre = new FiltreErreurs();

  it("renvoie une ErreurApi telle quelle : { code, message, details }", () => {
    const { reponse, hote } = simulerReponse();
    filtre.catch(
      new ErreurApi(HttpStatus.CONFLICT, 'COURRIEL_DEJA_UTILISE', 'Déjà utilisé'),
      hote,
    );
    expect(reponse.status).toHaveBeenCalledWith(409);
    expect(reponse.json).toHaveBeenCalledWith({
      code: 'COURRIEL_DEJA_UTILISE',
      message: 'Déjà utilisé',
      details: undefined,
    });
  });

  it('donne un code stable aux erreurs de NestJS (404 → INTROUVABLE)', () => {
    const { reponse, hote } = simulerReponse();
    filtre.catch(new NotFoundException(), hote);
    expect(reponse.status).toHaveBeenCalledWith(404);
    expect(reponse.json.mock.calls[0][0].code).toBe('INTROUVABLE');
  });

  it('traduit la limite de débit en 429 TROP_DE_DEMANDES', () => {
    const { reponse, hote } = simulerReponse();
    filtre.catch(new ThrottlerException(), hote);
    expect(reponse.status).toHaveBeenCalledWith(429);
    expect(reponse.json.mock.calls[0][0].code).toBe('TROP_DE_DEMANDES');
  });

  it('cache le détail d’une erreur imprévue (500 ERREUR_INTERNE), mais la journalise', () => {
    const journal = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    const { reponse, hote } = simulerReponse();

    filtre.catch(new Error('mot de passe de la base : secret123'), hote);

    expect(reponse.status).toHaveBeenCalledWith(500);
    const corps = reponse.json.mock.calls[0][0];
    expect(corps.code).toBe('ERREUR_INTERNE');
    expect(JSON.stringify(corps)).not.toContain('secret123');
    expect(journal).toHaveBeenCalled();
    journal.mockRestore();
  });
});
