import { ReviewsService } from './reviews.service';
import { CreateReviewDto, UpdateReviewDto } from './dto/create-review.dto';
export declare class ReviewsController {
    private readonly reviewsService;
    constructor(reviewsService: ReviewsService);
    create(user: any, cafeId: number, dto: CreateReviewDto): Promise<import("./entities/review.entity").Review | null>;
    update(user: any, reviewId: number, dto: UpdateReviewDto): Promise<import("./entities/review.entity").Review | null>;
    delete(user: any, reviewId: number): Promise<void>;
    findByCafe(cafeId: number, page?: number, limit?: number): Promise<{
        data: import("./entities/review.entity").Review[];
        meta: {
            page: number;
            limit: number;
            total: number;
        };
    }>;
    summary(cafeId: number): Promise<{
        category: string;
        avgScore: number;
        count: number;
    }[]>;
    myReviews(user: any): Promise<import("./entities/review.entity").Review[]>;
}
