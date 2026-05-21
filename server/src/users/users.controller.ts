import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { ChangePasswordDto, UpdateProfileDto } from './dto/update-profile.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getMe(@Request() req: any) {
    const user = await this.usersService.findById(
      req.user.userId ?? req.user.id,
    );
    if (!user) return null;
    const { passwordHash: _, ...rest } = user as any;
    return rest;
  }

  @Patch('me')
  async updateMe(@Request() req: any, @Body() dto: UpdateProfileDto) {
    const user = await this.usersService.updateProfile(
      req.user.userId ?? req.user.id,
      dto,
    );
    const { passwordHash: _, ...rest } = user as any;
    return rest;
  }

  @Post('me/password')
  async changePassword(@Request() req: any, @Body() dto: ChangePasswordDto) {
    await this.usersService.changePassword(
      req.user.userId ?? req.user.id,
      dto.currentPassword,
      dto.newPassword,
    );
    return { ok: true };
  }

  @Delete('me')
  async deleteAccount(@Request() req: any, @Body() dto: DeleteAccountDto) {
    await this.usersService.deleteAccount(req.user.userId ?? req.user.id, dto);
    return { ok: true };
  }
}
