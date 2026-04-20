import { Review } from './review.entity';
export declare class ReviewRating {
    id: number;
    reviewId: number;
    category: string;
    score: number;
    review: Review;
}
