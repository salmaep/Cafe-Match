import { Repository, DataSource } from 'typeorm';
import { Favorite } from './entities/favorite.entity';
export declare class FavoritesService {
    private readonly favoritesRepository;
    private readonly dataSource;
    constructor(favoritesRepository: Repository<Favorite>, dataSource: DataSource);
    toggle(userId: number, cafeId: number): Promise<{
        favorited: boolean;
    }>;
    findByUser(userId: number): Promise<Favorite[]>;
}
