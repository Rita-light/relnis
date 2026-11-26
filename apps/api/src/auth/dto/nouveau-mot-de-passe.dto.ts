import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { MOT_DE_PASSE_MAX, MOT_DE_PASSE_MIN } from './inscription.dto.js';

/** Le jeton du lien reçu par courriel, et le nouveau mot de passe (mêmes règles qu'à l'inscription). */
export class NouveauMotDePasseDto {
  @ApiProperty({ description: 'Le jeton du lien (après « jeton= »)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  jeton: string;

  @ApiProperty({
    example: 'un-nouveau-mot-de-passe',
    minLength: MOT_DE_PASSE_MIN,
    maxLength: MOT_DE_PASSE_MAX,
  })
  @IsString()
  @MinLength(MOT_DE_PASSE_MIN)
  @MaxLength(MOT_DE_PASSE_MAX)
  motDePasse: string;
}
