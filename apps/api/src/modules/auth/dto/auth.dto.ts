import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator"

export class SignupDto {
  @ApiProperty({ example: "anirudh@example.com" })
  @IsEmail()
  email: string

  @ApiProperty({ example: "anirudh" })
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-z0-9_\.]+$/, {
    message: "username may only contain lowercase letters, numbers, _ and .",
  })
  username: string

  @ApiProperty({ example: "Anirudh Sharma" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  displayName: string

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string
}

export class LoginDto {
  @ApiProperty()
  @IsEmail()
  email: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  password: string

  @ApiPropertyOptional({ description: "Device platform for session tracking" })
  @IsOptional()
  @IsIn(["ios", "android", "web"])
  platform?: string
}

export class RefreshDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refreshToken: string
}

export class ForgotPasswordDto {
  @ApiProperty()
  @IsEmail()
  email: string
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  token: string

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword: string
}
