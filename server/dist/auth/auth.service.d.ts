import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { RegisterOwnerDto } from './dto/register-owner.dto';
import { LoginDto } from './dto/login.dto';
export declare class AuthService {
    private readonly usersService;
    private readonly jwtService;
    constructor(usersService: UsersService, jwtService: JwtService);
    register(dto: RegisterDto): Promise<{
        id: number;
        email: string;
        name: string;
        role: string;
        createdAt: Date;
        updatedAt: Date;
        bookmarks: import("../bookmarks/entities/bookmark.entity").Bookmark[];
        favorites: import("../favorites/entities/favorite.entity").Favorite[];
    }>;
    registerOwner(dto: RegisterOwnerDto): Promise<{
        cafeName: string;
        cafeAddress: string;
        phone: string | undefined;
        id: number;
        email: string;
        name: string;
        role: string;
        createdAt: Date;
        updatedAt: Date;
        bookmarks: import("../bookmarks/entities/bookmark.entity").Bookmark[];
        favorites: import("../favorites/entities/favorite.entity").Favorite[];
    }>;
    login(dto: LoginDto): Promise<{
        accessToken: string;
        user: {
            id: number;
            email: string;
            name: string;
            role: string;
        };
    }>;
}
