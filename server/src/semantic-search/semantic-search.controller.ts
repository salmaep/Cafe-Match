import {
  Controller,
  Get,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { SemanticSearchService } from './semantic-search.service';
import { SemanticSearchDto } from './dto/semantic-search.dto';
import { Public } from '../common/decorators/public.decorator';

@Controller('cafes/semantic-search')
export class SemanticSearchController {
  private readonly logger = new Logger(SemanticSearchController.name);

  constructor(private readonly semanticSearch: SemanticSearchService) {}

  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  async search(@Query() dto: SemanticSearchDto) {
    try {
      return await this.semanticSearch.search(dto);
    } catch (err) {
      this.logger.error(`Semantic search failed, using fallback: ${String(err)}`);
      return this.semanticSearch.fallbackSearch(dto);
    }
  }
}
