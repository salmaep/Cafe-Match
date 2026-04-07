import { Repository, DataSource } from 'typeorm';
import { Bookmark } from './entities/bookmark.entity';
export declare class BookmarksService {
    private readonly bookmarksRepository;
    private readonly dataSource;
    constructor(bookmarksRepository: Repository<Bookmark>, dataSource: DataSource);
    toggle(userId: number, cafeId: number): Promise<{
        bookmarked: boolean;
    }>;
    findByUser(userId: number): Promise<Bookmark[]>;
    isBookmarked(userId: number, cafeId: number): Promise<boolean>;
}
