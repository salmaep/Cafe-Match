export declare class RatingDto {
    category: string;
    score: number;
}
export declare class MediaDto {
    mediaType: 'photo' | 'video';
    url: string;
}
export declare class CreateReviewDto {
    text?: string;
    ratings: RatingDto[];
    media?: MediaDto[];
}
export declare class UpdateReviewDto extends CreateReviewDto {
}
