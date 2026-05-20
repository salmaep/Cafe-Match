import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { DeletionRequest } from './entities/deletion-request.entity';
import { CreateDeletionRequestDto } from './dto/create-deletion-request.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(DeletionRequest)
    private readonly deletionRequestRepo: Repository<DeletionRequest>,
  ) {}

  /** Update profile fields (name, avatar). Returns sanitized user. */
  async updateProfile(
    id: number,
    patch: { name?: string; avatarUrl?: string },
  ): Promise<User> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User tidak ditemukan');

    if (patch.avatarUrl !== undefined) {
      // Allow either http(s) URL, data: URL, or empty string (clear avatar)
      const v = patch.avatarUrl.trim();
      if (
        v &&
        !v.startsWith('http://') &&
        !v.startsWith('https://') &&
        !v.startsWith('data:image/')
      ) {
        throw new BadRequestException(
          'URL avatar tidak valid (harus http(s) atau data:image/...).',
        );
      }
      user.avatarUrl = v || null;
    }
    if (patch.name !== undefined) user.name = patch.name;

    return this.usersRepository.save(user);
  }

  async changePassword(
    id: number,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User tidak ditemukan');
    if (!user.passwordHash) {
      throw new BadRequestException(
        'Akun ini tidak memiliki password (login via Google/Facebook).',
      );
    }
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Password lama salah.');
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await this.usersRepository.save(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findById(id: number): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async create(data: {
    email: string;
    passwordHash?: string | null;
    name: string;
    role?: string;
    provider?: string;
    providerId?: string | null;
  }): Promise<User> {
    const friendCode = await this.generateUniqueFriendCode();
    const user = this.usersRepository.create({ ...data, friendCode });
    return this.usersRepository.save(user);
  }

  async findByProvider(
    provider: string,
    providerId: string,
  ): Promise<User | null> {
    return this.usersRepository.findOne({ where: { provider, providerId } });
  }

  async findOrCreateSocial(args: {
    provider: 'google' | 'facebook';
    providerId: string;
    email: string;
    name: string;
    avatarUrl?: string;
  }): Promise<User> {
    let user = await this.findByProvider(args.provider, args.providerId);
    if (user) return user;
    // Link by email if exists
    user = await this.findByEmail(args.email);
    if (user) {
      user.provider = args.provider;
      user.providerId = args.providerId;
      if (!user.avatarUrl && args.avatarUrl) user.avatarUrl = args.avatarUrl;
      return this.usersRepository.save(user);
    }
    return this.create({
      email: args.email,
      name: args.name,
      passwordHash: null,
      provider: args.provider,
      providerId: args.providerId,
    });
  }

  async update(id: number, patch: Partial<User>): Promise<User | null> {
    await this.usersRepository.update(id, patch);
    return this.findById(id);
  }

  async deleteAccount(id: number, dto: DeleteAccountDto): Promise<void> {
    if (!dto.acknowledge) {
      throw new BadRequestException('Konfirmasi penghapusan akun diperlukan.');
    }
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User tidak ditemukan');

    if (user.passwordHash) {
      if (!dto.password) {
        throw new BadRequestException('Password wajib diisi untuk menghapus akun.');
      }
      const ok = await bcrypt.compare(dto.password, user.passwordHash);
      if (!ok) throw new UnauthorizedException('Password salah.');
    } else {
      if (
        !dto.emailConfirmation ||
        dto.emailConfirmation.trim().toLowerCase() !== user.email.toLowerCase()
      ) {
        throw new BadRequestException('Email konfirmasi tidak cocok.');
      }
    }

    await this.usersRepository.softRemove(user);
  }

  async createDeletionRequest(
    dto: CreateDeletionRequestDto,
    meta: { ip?: string | null; userAgent?: string | null },
  ): Promise<{ requestId: number }> {
    if (!dto.acknowledge) {
      throw new BadRequestException('Konfirmasi diperlukan.');
    }
    const normalizedEmail = dto.email.toLowerCase().trim();
    const user = await this.usersRepository.findOne({
      where: { email: normalizedEmail },
    });
    const record = this.deletionRequestRepo.create({
      email: normalizedEmail,
      friendCode: dto.friendCode?.toUpperCase() ?? null,
      reason: dto.reason ?? null,
      matchedUserId: user?.id ?? null,
      ipAddress: meta.ip ?? null,
      userAgent: meta.userAgent ?? null,
      status: 'pending',
    });
    await this.deletionRequestRepo.save(record);
    return { requestId: record.id };
  }

  /** Generate a unique 8-char alphanumeric friend code */
  private async generateUniqueFriendCode(): Promise<string> {
    for (let i = 0; i < 10; i++) {
      const code = Math.random().toString(36).slice(2, 10).toUpperCase();
      const exists = await this.usersRepository.findOne({
        where: { friendCode: code },
      });
      if (!exists) return code;
    }
    // Extremely unlikely fallback
    return Date.now().toString(36).toUpperCase().slice(0, 8);
  }
}
