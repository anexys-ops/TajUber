import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";

export class CreateDriverDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: "Mot de passe : au moins 8 caractères" })
  password!: string;

  @IsOptional()
  @IsString()
  displayName?: string;
}
