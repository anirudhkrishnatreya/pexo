import { ApiPropertyOptional } from "@nestjs/swagger"
import { Type } from "class-transformer"
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator"

export class PaginationDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20

  @ApiPropertyOptional({ description: "Free-text search" })
  @IsOptional()
  @IsString()
  q?: string

  @ApiPropertyOptional({ enum: ["asc", "desc"], default: "desc" })
  @IsOptional()
  @IsIn(["asc", "desc"])
  order: "asc" | "desc" = "desc"

  get skip(): number {
    return (this.page - 1) * this.limit
  }
}

export function paginated<T>(items: T[], total: number, dto: PaginationDto) {
  return {
    items,
    meta: {
      total,
      page: dto.page,
      limit: dto.limit,
      totalPages: Math.max(1, Math.ceil(total / dto.limit)),
    },
  }
}
