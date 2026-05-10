import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Guards admin/infrastructure endpoints (e.g. Meili reindex) using a static
 * API key from `ADMIN_API_KEY`. Lighter-weight than JWT for automation/scripts.
 */
@Injectable()
export class AdminApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];
    const expectedKey = this.configService.get<string>('ADMIN_API_KEY');

    if (!expectedKey) {
      throw new UnauthorizedException('ADMIN_API_KEY not configured');
    }
    if (!apiKey || apiKey !== expectedKey) {
      throw new UnauthorizedException('Invalid admin API key');
    }
    return true;
  }
}
