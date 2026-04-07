import { Repository } from 'typeorm';
import { CafeMenu } from './entities/cafe-menu.entity';
export declare class MenusService {
    private readonly menusRepository;
    constructor(menusRepository: Repository<CafeMenu>);
    findByCafe(cafeId: number): Promise<CafeMenu[]>;
}
