import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, MaxLength } from 'class-validator';
import { courrielNormalise } from '../../commun/transformations.js';

/** Le courriel du compte dont on a oublié le mot de passe. */
export class MotDePasseOublieDto {
  @ApiProperty({ example: 'marie@plomberie-tremblay.ca' })
  @Transform(courrielNormalise)
  @IsEmail()
  @MaxLength(254)
  courriel: string;
}
