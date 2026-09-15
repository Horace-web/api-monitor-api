import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class UpdateMonitorDto {
  @Type(() => Number)
  @IsInt()
  @Min(60)
  @Max(86400)
  interval!: number;
}
