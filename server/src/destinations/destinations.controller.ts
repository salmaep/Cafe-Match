import { Controller, Get } from '@nestjs/common';
import { DestinationsService } from './destinations.service';
import { Public } from '../common/decorators/public.decorator';

@Controller('destinations')
export class DestinationsController {
  constructor(private readonly destinationsService: DestinationsService) {}

  @Public()
  @Get()
  findAll() {
    return this.destinationsService.findAll();
  }
}
