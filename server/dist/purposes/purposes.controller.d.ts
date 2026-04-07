import { PurposesService } from './purposes.service';
export declare class PurposesController {
    private readonly purposesService;
    constructor(purposesService: PurposesService);
    findAll(): Promise<import("./entities/purpose.entity").Purpose[]>;
}
