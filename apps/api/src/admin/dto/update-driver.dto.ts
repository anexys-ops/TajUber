import { IsOptional, IsString, MinLength } from "class-validator";

export class UpdateDriverDto {
  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: "Mot de passe : au moins 8 caractères" })
  password?: string;
}
