import { ApiPropertyOptional } from "@nestjs/swagger"
import { Gender } from "@prisma/client"
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator"

export class UpdateProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(60)
  displayName?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  bio?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatarUrl?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coverUrl?: string

  @ApiPropertyOptional({ enum: Gender })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender

  @ApiPropertyOptional({ minimum: 80, maximum: 260 })
  @IsOptional()
  @IsNumber()
  @Min(80)
  @Max(260)
  heightCm?: number

  @ApiPropertyOptional({ minimum: 20, maximum: 400 })
  @IsOptional()
  @IsNumber()
  @Min(20)
  @Max(400)
  weightKg?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  fitnessGoal?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(800)
  @Max(8000)
  caloriesGoal?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(20)
  @Max(400)
  proteinGoalG?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(500)
  @Max(8000)
  waterGoalMl?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  privateProfile?: boolean
}
