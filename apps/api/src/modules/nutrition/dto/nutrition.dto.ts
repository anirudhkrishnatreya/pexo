import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"
import { Type } from "class-transformer"
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from "class-validator"

export class LogFoodDto {
  @ApiProperty({ description: "FoodItem id (from search or barcode lookup)" })
  @IsString()
  foodItemId: string

  @ApiProperty({ enum: ["BREAKFAST", "LUNCH", "DINNER", "SNACK"] })
  @IsIn(["BREAKFAST", "LUNCH", "DINNER", "SNACK"])
  meal: "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK"

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.1)
  @Max(50)
  servings?: number
}

export class LogWaterDto {
  @ApiProperty({ description: "Milliliters", example: 250 })
  @Type(() => Number)
  @IsInt()
  @Min(10)
  @Max(3000)
  amountMl: number
}

export class LogWeightDto {
  @ApiProperty({ example: 72.5 })
  @Type(() => Number)
  @IsNumber()
  @Min(20)
  @Max(400)
  weightKg: number

  @ApiPropertyOptional({ example: 18.2 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(2)
  @Max(70)
  bodyFatPct?: number
}

export class CreateFoodItemDto {
  @ApiProperty()
  @IsString()
  @MaxLength(120)
  name: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  brand?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  barcode?: string

  @ApiPropertyOptional({ default: "100 g" })
  @IsOptional()
  @IsString()
  servingDesc?: string

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  calories: number

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  proteinG: number

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  carbsG: number

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  fatG: number

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  fiberG?: number

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  sugarG?: number
}
