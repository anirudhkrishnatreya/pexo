import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"
import { Type } from "class-transformer"
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from "class-validator"

export class TrackPointDto {
  @ApiProperty()
  @IsNumber()
  lat: number

  @ApiProperty()
  @IsNumber()
  lng: number

  @ApiProperty({ description: "Unix epoch milliseconds" })
  @IsNumber()
  t: number

  @ApiPropertyOptional({ description: "Elevation in meters" })
  @IsOptional()
  @IsNumber()
  ele?: number

  @ApiPropertyOptional({ description: "GPS accuracy in meters" })
  @IsOptional()
  @IsNumber()
  acc?: number

  @ApiPropertyOptional({ description: "Heart rate" })
  @IsOptional()
  @IsInt()
  hr?: number
}

export class CreateActivityDto {
  @ApiProperty({ enum: ["RUN", "WALK", "RIDE", "SWIM", "HIKE"] })
  @IsIn(["RUN", "WALK", "RIDE", "SWIM", "HIKE"])
  type: "RUN" | "WALK" | "RIDE" | "SWIM" | "HIKE"

  @ApiProperty()
  @IsString()
  @MaxLength(120)
  title: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string

  @ApiPropertyOptional({ enum: ["PUBLIC", "FOLLOWERS", "PRIVATE"], default: "PUBLIC" })
  @IsOptional()
  @IsIn(["PUBLIC", "FOLLOWERS", "PRIVATE"])
  visibility?: "PUBLIC" | "FOLLOWERS" | "PRIVATE"

  @ApiProperty({ type: [TrackPointDto], description: "Recorded GPS track" })
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => TrackPointDto)
  trackPoints: TrackPointDto[]

  @ApiPropertyOptional({ description: "Seconds spent paused (auto-pause)" })
  @IsOptional()
  @IsInt()
  pausedSec?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  avgHeartRate?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  avgCadence?: number
}
