import { FavoritesService } from './favorites.service';
export declare class FavoritesController {
    private readonly favoritesService;
    constructor(favoritesService: FavoritesService);
    toggle(req: any, cafeId: number): Promise<{
        favorited: boolean;
    }>;
    findAll(req: any): Promise<import("./entities/favorite.entity").Favorite[]>;
}
