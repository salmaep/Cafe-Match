import { Repository, DataSource } from 'typeorm';
import { Review } from './entities/review.entity';
import { ReviewRating } from './entities/review-rating.entity';
import { ReviewMedia } from './entities/review-media.entity';
import { CreateReviewDto, UpdateReviewDto } from './dto/create-review.dto';
import { AchievementsService } from '../achievements/achievements.service';
export declare class ReviewsService {
    private readonly reviewRepo;
    private readonly ratingRepo;
    private readonly mediaRepo;
    private readonly dataSource;
    private readonly achievementsService;
    constructor(reviewRepo: Repository<Review>, ratingRepo: Repository<ReviewRating>, mediaRepo: Repository<ReviewMedia>, dataSource: DataSource, achievementsService: AchievementsService);
    private validateMedia;
    create(userId: number, cafeId: number, dto: CreateReviewDto): Promise<Review | null>;
    update(userId: number, reviewId: number, dto: UpdateReviewDto): Promise<Review | null>;
    delete(userId: number, reviewId: number): Promise<void>;
    findByCafe(cafeId: number, page?: number, limit?: number): Promise<{
        data: Review[];
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
    findByUser(userId: number): Promise<Review[]>;
    private readonly MOOD_TO_PURPOSE_SLUG;
    private readonly FACILITY_REVIEW_KEYS;
    private readonly SIGNAL_MIN_VOTES;
    private aggregateCafeSignals;
}
