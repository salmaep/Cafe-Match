import { Body, Controller, HttpCode, Post, Req } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { UsersService } from './users.service';
import { CreateDeletionRequestDto } from './dto/create-deletion-request.dto';

@Controller('deletion-requests')
export class DeletionRequestsController {
  constructor(private readonly usersService: UsersService) {}

  @Public()
  @Post()
  @HttpCode(200)
  async create(@Body() dto: CreateDeletionRequestDto, @Req() req: any) {
    const forwarded = req.headers['x-forwarded-for'];
    const ip =
      (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0]) ??
      req.ip ??
      null;
    const ua = (req.headers['user-agent'] as string) ?? null;
    await this.usersService.createDeletionRequest(dto, { ip, userAgent: ua });
    return {
      ok: true,
      message: 'Permintaan diterima. Kami akan memproses dalam 30 hari kerja.',
    };
  }
}
