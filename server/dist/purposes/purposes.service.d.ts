import { Repository } from 'typeorm';
import { Purpose } from './entities/purpose.entity';
export declare class PurposesService {
    private readonly purposesRepository;
    constructor(purposesRepository: Repository<Purpose>);
    findAll(): Promise<Purpose[]>;
}
