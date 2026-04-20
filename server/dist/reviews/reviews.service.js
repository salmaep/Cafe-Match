"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const review_entity_1 = require("./entities/review.entity");
const review_rating_entity_1 = require("./entities/review-rating.entity");
const review_media_entity_1 = require("./entities/review-media.entity");
const achievements_service_1 = require("../achievements/achievements.service");
let ReviewsService = class ReviewsService {
    reviewRepo;
    ratingRepo;
    mediaRepo;
    dataSource;
    achievementsService;
    constructor(reviewRepo, ratingRepo, mediaRepo, dataSource, achievementsService) {
        this.reviewRepo = reviewRepo;
        this.ratingRepo = ratingRepo;
        this.mediaRepo = mediaRepo;
        this.dataSource = dataSource;
        this.achievementsService = achievementsService;
    }
    validateMedia(media) {
        if (!media)
            return;
        const photos = media.filter((m) => m.mediaType === 'photo');
        const videos = media.filter((m) => m.mediaType === 'video');
        if (photos.length > 5) {
            throw new Error('Maksimal 5 foto per review');
        }
        if (videos.length > 2) {
            throw new Error('Maksimal 2 video per review');
        }
    }
    async create(userId, cafeId, dto) {
        const existing = await this.reviewRepo.findOne({ where: { userId, cafeId } });
        if (existing)
            throw new common_1.ConflictException('Kamu sudah pernah review cafe ini');
        const review = this.reviewRepo.create({
            userId,
            cafeId,
            text: dto.text ?? null,
        });
        const saved = await this.reviewRepo.save(review);
        const savedId = saved.id ?? saved[0]?.id;
        if (dto.ratings?.length) {
            const ratings = dto.ratings.map((r) => this.ratingRepo.create({ reviewId: savedId, category: r.category, score: r.score }));
            await this.ratingRepo.save(ratings);
        }
        this.validateMedia(dto.media);
        if (dto.media?.length) {
            const mediaRows = dto.media.map((m, i) => this.mediaRepo.create({
                reviewId: savedId,
                mediaType: m.mediaType,
                url: m.url,
                displayOrder: i,
            }));
            await this.mediaRepo.save(mediaRows);
        }
        try {
            const total = await this.reviewRepo.count({ where: { userId } });
            await this.achievementsService.checkSocialAchievements(userId, 'reviews', total);
        }
        catch (err) {
            console.warn('[reviews] achievement check failed:', err?.message);
        }
        try {
            await this.aggregateCafeSignals(cafeId);
        }
        catch (err) {
            console.warn('[reviews] cafe signal aggregation failed:', err?.message);
        }
        return this.reviewRepo.findOne({
            where: { id: savedId },
            relations: ['user', 'ratings', 'media'],
        });
    }
    async update(userId, reviewId, dto) {
        const review = await this.reviewRepo.findOne({ where: { id: reviewId }, relations: ['ratings'] });
        if (!review)
            throw new common_1.NotFoundException('Review tidak ditemukan');
        if (review.userId !== userId)
            throw new common_1.ForbiddenException('Bukan review kamu');
        review.text = dto.text ?? null;
        await this.reviewRepo.save(review);
        await this.ratingRepo.delete({ reviewId });
        if (dto.ratings?.length) {
            const ratings = dto.ratings.map((r) => this.ratingRepo.create({ reviewId, category: r.category, score: r.score }));
            await this.ratingRepo.save(ratings);
        }
        this.validateMedia(dto.media);
        await this.mediaRepo.delete({ reviewId });
        if (dto.media?.length) {
            const mediaRows = dto.media.map((m, i) => this.mediaRepo.create({
                reviewId,
                mediaType: m.mediaType,
                url: m.url,
                displayOrder: i,
            }));
            await this.mediaRepo.save(mediaRows);
        }
        try {
            await this.aggregateCafeSignals(review.cafeId);
        }
        catch { }
        return this.reviewRepo.findOne({
            where: { id: reviewId },
            relations: ['user', 'ratings', 'media'],
        });
    }
    async delete(userId, reviewId) {
        const review = await this.reviewRepo.findOne({ where: { id: reviewId } });
        if (!review)
            throw new common_1.NotFoundException('Review tidak ditemukan');
        if (review.userId !== userId)
            throw new common_1.ForbiddenException('Bukan review kamu');
        const cafeId = review.cafeId;
        await this.reviewRepo.remove(review);
        try {
            await this.aggregateCafeSignals(cafeId);
        }
        catch { }
    }
    async findByCafe(cafeId, page = 1, limit = 20) {
        const [data, total] = await this.reviewRepo.findAndCount({
            where: { cafeId },
            relations: ['user', 'ratings', 'media'],
            order: { createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });
        return { data, meta: { page, limit, total } };
    }
    async summary(cafeId) {
        const rows = await this.dataSource.query(`SELECT rr.category, AVG(rr.score) AS avg_score, COUNT(*) AS count
         FROM review_ratings rr
         JOIN reviews r ON r.id = rr.review_id
         WHERE r.cafe_id = ?
         GROUP BY rr.category`, [cafeId]);
        return rows.map((r) => ({
            category: r.category,
            avgScore: Math.round(parseFloat(r.avg_score) * 10) / 10,
            count: parseInt(r.count, 10),
        }));
    }
    async findByUser(userId) {
        return this.reviewRepo.find({
            where: { userId },
            relations: ['cafe', 'ratings', 'media'],
            order: { createdAt: 'DESC' },
        });
    }
    MOOD_TO_PURPOSE_SLUG = {
        mood_me_time: 'me-time',
        'mood_me-time': 'me-time',
        mood_date: 'date',
        mood_family: 'family',
        mood_family_time: 'family',
        mood_group_study: 'group-work',
        'mood_group-work': 'group-work',
        mood_wfc: 'wfc',
    };
    FACILITY_REVIEW_KEYS = new Set([
        'wifi', 'power_outlet', 'mushola', 'parking',
        'kid_friendly', 'quiet_atmosphere', 'large_tables', 'outdoor_area',
    ]);
    SIGNAL_MIN_VOTES = 2;
    async aggregateCafeSignals(cafeId) {
        const moodVotes = await this.dataSource.query(`SELECT rr.category, COUNT(DISTINCT r.user_id) AS votes
         FROM review_ratings rr
         JOIN reviews r ON r.id = rr.review_id
         WHERE r.cafe_id = ? AND rr.category LIKE 'mood_%'
         GROUP BY rr.category`, [cafeId]);
        for (const m of moodVotes) {
            const slug = this.MOOD_TO_PURPOSE_SLUG[m.category];
            if (!slug)
                continue;
            const votes = parseInt(m.votes, 10);
            if (votes < this.SIGNAL_MIN_VOTES)
                continue;
            const boost = Math.min(50, votes * 10);
            const [existing] = await this.dataSource.query(`SELECT score FROM cafe_purpose_tags WHERE cafe_id = ? AND purpose_slug = ?`, [cafeId, slug]);
            const baseline = existing ? parseInt(existing.score, 10) : 0;
            const finalScore = Math.min(100, Math.max(baseline, 40 + boost));
            await this.dataSource.query(`INSERT INTO cafe_purpose_tags (cafe_id, purpose_slug, score)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE score = GREATEST(score, VALUES(score))`, [cafeId, slug, finalScore]);
        }
        const facilityVotes = await this.dataSource.query(`SELECT rr.category, COUNT(DISTINCT r.user_id) AS votes
         FROM review_ratings rr
         JOIN reviews r ON r.id = rr.review_id
         WHERE r.cafe_id = ? AND rr.category LIKE 'facility_%'
         GROUP BY rr.category`, [cafeId]);
        for (const f of facilityVotes) {
            const key = f.category.replace(/^facility_/, '');
            if (!this.FACILITY_REVIEW_KEYS.has(key))
                continue;
            const votes = parseInt(f.votes, 10);
            if (votes < this.SIGNAL_MIN_VOTES)
                continue;
            const [existing] = await this.dataSource.query(`SELECT id FROM cafe_facilities WHERE cafe_id = ? AND facility_key = ? LIMIT 1`, [cafeId, key]);
            if (!existing) {
                await this.dataSource.query(`INSERT INTO cafe_facilities (cafe_id, facility_key, facility_value)
           VALUES (?, ?, ?)`, [cafeId, key, `reviews:${votes}`]);
            }
        }
        const flagUpdates = [
            { key: 'wifi', col: 'wifi_available' },
            { key: 'mushola', col: 'has_mushola' },
            { key: 'parking', col: 'has_parking' },
        ];
        for (const { key, col } of flagUpdates) {
            const [f] = await this.dataSource.query(`SELECT 1 FROM cafe_facilities WHERE cafe_id = ? AND facility_key = ? LIMIT 1`, [cafeId, key]);
            if (f) {
                await this.dataSource.query(`UPDATE cafes SET ${col} = TRUE WHERE id = ? AND ${col} = FALSE`, [cafeId]);
            }
        }
    }
};
exports.ReviewsService = ReviewsService;
exports.ReviewsService = ReviewsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(review_entity_1.Review)),
    __param(1, (0, typeorm_1.InjectRepository)(review_rating_entity_1.ReviewRating)),
    __param(2, (0, typeorm_1.InjectRepository)(review_media_entity_1.ReviewMedia)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource,
        achievements_service_1.AchievementsService])
], ReviewsService);
//# sourceMappingURL=reviews.service.js.map