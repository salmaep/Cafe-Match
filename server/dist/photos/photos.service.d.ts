import { Repository } from 'typeorm';
import { CafePhoto } from './entities/cafe-photo.entity';
export declare class PhotosService {
    private readonly photosRepository;
    constructor(photosRepository: Repository<CafePhoto>);
    findByCafe(cafeId: number): Promise<CafePhoto[]>;
}
