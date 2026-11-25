import { join } from 'node:path';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Mailer } from '@nestjs/mail';
import { DOSSIER_MODELES } from './dossier-modeles.js';

// Logo joint au courriel et affiché par <img src="cid:logo"> (les messageries bloquent souvent le SVG).
const LOGO = { path: join(DOSSIER_MODELES, 'logo.png'), cid: 'logo' };

/** Rédige et envoie les courriels (modèles dans ./modeles ; Mailpit en local, Brevo pour un vrai envoi). */
@Injectable()
export class CourrielsService {
  constructor(
    private readonly mailer: Mailer,
    private readonly config: ConfigService,
  ) {}

  /** Lien pour confirmer l'adresse courriel. */
  async envoyerVerification(
    destinataire: { courriel: string; prenom: string },
    jeton: string,
    dureeHeures: number,
  ) {
    const lien = `${this.config.getOrThrow<string>('URL_WEB')}/verifier-courriel?jeton=${jeton}`;

    // Les valeurs du contexte sont échappées par le modèle : un prénom piégé ne peut pas injecter de HTML.
    await this.mailer.send({
      to: destinataire.courriel,
      subject: 'Confirmez votre adresse courriel',
      template: 'verification-courriel',
      context: { prenom: destinataire.prenom, lien, dureeHeures },
      attachments: [LOGO],
    });
  }
}
