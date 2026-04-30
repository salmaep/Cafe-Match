import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { SyncCafeDto } from './sync-cafe.dto';

export class SyncCafesBatchDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncCafeDto)
  cafes: SyncCafeDto[];
}
