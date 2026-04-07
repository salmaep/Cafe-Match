import { CafesService } from './cafes.service';
import { SearchCafesDto } from './dto/search-cafes.dto';
import { CreateCafeDto } from './dto/create-cafe.dto';
export declare class CafesController {
    private readonly cafesService;
    constructor(cafesService: CafesService);
    search(dto: SearchCafesDto): Promise<{
        data: any[];
        meta: any;
    } | {
        data: any;
        meta: {
            page: number;
            limit: number;
            total: number;
        };
    }>;
    findOne(id: number): Promise<import("./entities/cafe.entity").Cafe>;
    create(dto: CreateCafeDto): Promise<import("./entities/cafe.entity").Cafe>;
}
