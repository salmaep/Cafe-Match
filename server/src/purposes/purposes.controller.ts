import { Controller, Get } from '@nestjs/common';
import { PurposesService } from './purposes.service';
import { Public } from '../common/decorators/public.decorator';

@Controller('purposes')
export class PurposesController {
  constructor(private readonly purposesService: PurposesService) {}

  @Public()
  @Get()
  findAll() {
    return this.purposesService.findAll();
  }
}
