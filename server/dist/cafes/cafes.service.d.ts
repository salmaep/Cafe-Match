import { Repository, DataSource } from 'typeorm';
import { Cafe } from './entities/cafe.entity';
import { CafeFacility } from './entities/cafe-facility.entity';
import { PurposeRequirement } from '../purposes/entities/purpose-requirement.entity';
import { SearchCafesDto } from './dto/search-cafes.dto';
import { CreateCafeDto } from './dto/create-cafe.dto';
export declare class CafesService {
    private readonly cafesRepository;
    private readonly facilitiesRepository;
    private readonly requirementsRepository;
    private readonly dataSource;
    constructor(cafesRepository: Repository<Cafe>, facilitiesRepository: Repository<CafeFacility>, requirementsRepository: Repository<PurposeRequirement>, dataSource: DataSource);
    search(dto: SearchCafesDto): Promise<{
        data: any;
        meta: {
            page: number;
            limit: number;
            total: number;
        };
    } | {
        data: any[];
        meta: any;
    }>;
    private searchByText;
    private findCafesInRadius;
    private filterByPurpose;
    findOne(id: number): Promise<Cafe>;
    create(dto: CreateCafeDto): Promise<Cafe>;
    private generateSlug;
}
