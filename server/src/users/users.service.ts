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
    passwordHash: string;
    name: string;
    role?: string;
  }): Promise<User> {
    const friendCode = await this.generateUniqueFriendCode();
    const user = this.usersRepository.create({ ...data, friendCode });
    return this.usersRepository.save(user);
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
