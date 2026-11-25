import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength } from 'class-validator';
import { courrielNormalise } from '../../commun/transformations.js';

/** Identifiants de connexion. */
export class ConnexionDto {
  @ApiProperty({ example: 'marie@plomberie-tremblay.ca' })
  @Transform(courrielNormalise)
  @IsEmail()
  @MaxLength(254)
  courriel: string;

  // Pas de longueur minimale ici : on ne donne aucun indice sur les règles du mot de passe.
  @ApiProperty({ example: 'un-mot-de-passe-solide' })
  @IsString()
  @MaxLength(128)
  motDePasse: string;
}
