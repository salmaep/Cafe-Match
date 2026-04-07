import { BookmarksService } from './bookmarks.service';
export declare class BookmarksController {
    private readonly bookmarksService;
    constructor(bookmarksService: BookmarksService);
    toggle(req: any, cafeId: number): Promise<{
        bookmarked: boolean;
    }>;
    findAll(req: any): Promise<import("./entities/bookmark.entity").Bookmark[]>;
}
