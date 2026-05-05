import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

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
