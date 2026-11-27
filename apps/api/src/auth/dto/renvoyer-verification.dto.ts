import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, MaxLength } from 'class-validator';
import { courrielNormalise } from '../../commun/transformations.js';

/** Le courriel à qui renvoyer un lien de vérification. */
export class RenvoyerVerificationDto {
  @ApiProperty({ example: 'marie@plomberie-tremblay.ca' })
  @Transform(courrielNormalise)
  @IsEmail()
  @MaxLength(254)
  courriel: string;
}
