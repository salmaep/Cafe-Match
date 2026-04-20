import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { RegisterOwnerDto } from './dto/register-owner.dto';
import { LoginDto } from './dto/login.dto';
import { Cafe } from '../cafes/entities/cafe.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    @InjectRepository(Cafe)
    private readonly cafesRepo: Repository<Cafe>,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create({
      email: dto.email,
      passwordHash,
      name: dto.name,
    });

    const { passwordHash: _, ...result } = user;
    return result;
  }

  async registerOwner(dto: RegisterOwnerDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create({
      email: dto.email,
      passwordHash,
      name: dto.name,
      role: 'owner',
    });

    // Create the owner's cafe so they see it on first login
    const slug = dto.cafeName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
      .slice(0, 60) +
      '-' +
      Date.now().toString(36);

    // Default coordinates to Bandung city center if not provided
    const defaultLat = -6.9175;
    const defaultLng = 107.6191;

    try {
      await this.cafesRepo.query(
        `INSERT INTO cafes (
          name, slug, address, phone, latitude, longitude, location,
          owner_id, google_maps_url, price_range, is_active,
          wifi_available, has_mushola, has_parking,
          has_active_promotion, bookmarks_count, favorites_count
        ) VALUES (?, ?, ?, ?, ?, ?,
          ST_PointFromText(CONCAT('POINT(', ?, ' ', ?, ')'), 4326),
          ?, ?, '$$', TRUE,
          FALSE, FALSE, FALSE,
          FALSE, 0, 0)`,
        [
          dto.cafeName,
          slug,
          dto.cafeAddress,
          dto.phone || null,
          defaultLat,
          defaultLng,
          defaultLng, // POINT wants (lng lat)
          defaultLat,
          user.id,
          `https://maps.google.com/?q=${defaultLat},${defaultLng}`,
        ],
      );
    } catch (err: any) {
      console.warn('[auth] Failed to create owner cafe on registration:', err.message);
      // Don't fail registration — user can still log in, just without a cafe
    }

    const { passwordHash: _, ...result } = user;
    return { ...result, cafeName: dto.cafeName, cafeAddress: dto.cafeAddress, phone: dto.phone };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        friendCode: user.friendCode,
        avatarUrl: user.avatarUrl,
      },
    };
  }
}
