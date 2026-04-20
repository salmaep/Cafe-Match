import { IsNumber, IsOptional, IsInt } from 'class-validator';

export class CheckInDto {
  @IsInt()
  cafeId: number;

  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;
}

export class CheckOutDto {
  @IsOptional()
  @IsInt()
  checkinId?: number;

  @IsOptional()
  @IsInt()
  cafeId?: number;
}
