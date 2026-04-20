import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
export declare class UsersService {
    private readonly usersRepository;
    constructor(usersRepository: Repository<User>);
    findByEmail(email: string): Promise<User | null>;
    findById(id: number): Promise<User | null>;
    create(data: {
        email: string;
        passwordHash: string;
        name: string;
        role?: string;
    }): Promise<User>;
    private generateUniqueFriendCode;
}
