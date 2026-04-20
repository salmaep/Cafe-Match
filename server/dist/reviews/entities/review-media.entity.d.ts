import { Review } from './review.entity';
export declare class ReviewMedia {
    id: number;
    reviewId: number;
    mediaType: 'photo' | 'video';
    url: string;
    displayOrder: number;
    createdAt: Date;
    review: Review;
}
