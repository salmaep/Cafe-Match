import { User } from '../../users/entities/user.entity';
import { Cafe } from '../../cafes/entities/cafe.entity';
import { ReviewRating } from './review-rating.entity';
import { ReviewMedia } from './review-media.entity';
export declare class Review {
    id: number;
    userId: number;
    cafeId: number;
    text: string | null;
    createdAt: Date;
    updatedAt: Date;
    user: User;
    cafe: Cafe;
    ratings: ReviewRating[];
    media: ReviewMedia[];
}
