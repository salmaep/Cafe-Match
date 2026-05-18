import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  Request,
  Logger,
} from '@nestjs/common';
import { CafesService } from './cafes.service';
import { SearchCafesDto } from './dto/search-cafes.dto';
import { DiscoverCafesDto } from './dto/discover-cafes.dto';
import { CreateCafeDto } from './dto/create-cafe.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { SemanticSearchService } from '../semantic-search/semantic-search.service';
import { SemanticSearchDto } from '../semantic-search/dto/semantic-search.dto';

@Controller('cafes')
export class CafesController {
  private readonly logger = new Logger(CafesController.name);

  constructor(
    private readonly cafesService: CafesService,
    private readonly semanticSearch: SemanticSearchService,
  ) {}

  @Public()
  @Get()
  search(@Query() dto: SearchCafesDto) {
    return this.cafesService.search(dto);
  }

  @Public()
  @Get('promoted')
  getPromoted(@Query('type') type?: string) {
    return this.cafesService.findPromotedCafes(type);
  }

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get('discover')
  discover(@Request() req: any, @Query() dto: DiscoverCafesDto) {
    const userId = req.user?.id ?? null;
    return this.cafesService.findDiscoverDeck(userId, dto);
  }

  // Natural-language semantic search powered by Claude Haiku + Meilisearch.
  // Must be declared BEFORE @Get(':id') — otherwise 'semantic-search' is parsed as id.
  @Public()
  @Get('semantic-search')
  async searchSemantic(@Query() dto: SemanticSearchDto) {
    try {
      return await this.semanticSearch.search(dto);
    } catch (err) {
      this.logger.error(
        `Semantic search failed, using fallback: ${String(err)}`,
      );
      return this.semanticSearch.fallbackSearch(dto);
    }
  }

  // Returns the facility catalog grouped by category with per-option counts.
  // Drives the FilterPanel UI on the homepage. Counts are cached 60s.
  // Must be declared BEFORE the @Get(':id') route below.
  @Public()
  @Get('filters')
  getFilters(@Query('isOptions') isOptions?: string) {
    return this.cafesService.getFilters(isOptions === 'true');
  }

  @Public()
  @Get(':id/google-reviews')
  getGoogleReviews(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.cafesService.getGoogleReviews(
      id,
      page ? +page : 1,
      limit ? +limit : 5,
    );
  }

  @Public()
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.cafesService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post()
  create(@Body() dto: CreateCafeDto) {
    return this.cafesService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async softDelete(@Param('id', ParseIntPipe) id: number) {
    await this.cafesService.softRemove(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  async restore(@Param('id', ParseIntPipe) id: number) {
    await this.cafesService.restore(id);
    return { message: 'Cafe restored successfully' };
  }
}
