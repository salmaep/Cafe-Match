import { Bookmark } from '../../bookmarks/entities/bookmark.entity';
import { Favorite } from '../../favorites/entities/favorite.entity';
export declare class User {
    id: number;
    email: string;
    passwordHash: string;
    name: string;
    role: string;
    friendCode: string;
    avatarUrl: string;
    createdAt: Date;
    updatedAt: Date;
    bookmarks: Bookmark[];
    favorites: Favorite[];
}
