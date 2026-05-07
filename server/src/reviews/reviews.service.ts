import { Injectable, ForbiddenException, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Review } from './entities/review.entity';
import { ReviewRating } from './entities/review-rating.entity';
import { ReviewMedia } from './entities/review-media.entity';
import { CreateReviewDto, UpdateReviewDto } from './dto/create-review.dto';
import { AchievementsService } from '../achievements/achievements.service';
import { MeiliCafesService } from '../meili/meili-cafes.service';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepo: Repository<Review>,
    @InjectRepository(ReviewRating)
    private readonly ratingRepo: Repository<ReviewRating>,
    @InjectRepository(ReviewMedia)
    private readonly mediaRepo: Repository<ReviewMedia>,
    private readonly dataSource: DataSource,
    private readonly achievementsService: AchievementsService,
    private readonly meiliCafes: MeiliCafesService,
  ) {}

  private async resyncCafeIndex(cafeId: number): Promise<void> {
    try {
      await this.meiliCafes.indexCafe(cafeId);
    } catch (err: any) {
      console.warn('[reviews] meili reindex failed for cafe', cafeId, err?.message);
    }
  }

  /** Enforce: max 5 photos + 2 videos */
  private validateMedia(media?: { mediaType: string; url: string }[]) {
    if (!media) return;
    const photos = media.filter((m) => m.mediaType === 'photo');
    const videos = media.filter((m) => m.mediaType === 'video');
    if (photos.length > 5) {
      throw new Error('Maksimal 5 foto per review');
    }
    if (videos.length > 2) {
      throw new Error('Maksimal 2 video per review');
    }
  }

  async create(userId: number, cafeId: number, dto: CreateReviewDto) {
    const existing = await this.reviewRepo.findOne({ where: { userId, cafeId } });
    if (existing) throw new ConflictException('Kamu sudah pernah review cafe ini');

    const review = this.reviewRepo.create({
      userId,
      cafeId,
      text: dto.text ?? null,
    } as Partial<Review>);
    const saved = await this.reviewRepo.save(review);
    const savedId = (saved as any).id ?? (saved as any)[0]?.id;

    if (dto.ratings?.length) {
      const ratings = dto.ratings.map((r) =>
        this.ratingRepo.create({ reviewId: savedId, category: r.category, score: r.score }),
      );
      await this.ratingRepo.save(ratings);
    }

    this.validateMedia(dto.media);
    if (dto.media?.length) {
      const mediaRows = dto.media.map((m, i) =>
        this.mediaRepo.create({
          reviewId: savedId,
          mediaType: m.mediaType,
          url: m.url,
          displayOrder: i,
        }),
      );
      await this.mediaRepo.save(mediaRows);
    }

    // Trigger review achievements
    try {
      const total = await this.reviewRepo.count({ where: { userId } });
      await this.achievementsService.checkSocialAchievements(userId, 'reviews', total);
    } catch (err: any) {
      console.warn('[reviews] achievement check failed:', err?.message);
    }

    // Aggregate mood + facility signals from all reviews on this cafe into
    // cafe_purpose_tags + cafe_facilities so Discovery/Wizard/Trending reflect
    // real user-contributed data (boosts the original scraped analysis).
    try {
      await this.aggregateCafeSignals(cafeId);
    } catch (err: any) {
      console.warn('[reviews] cafe signal aggregation failed:', err?.message);
    }

    await this.resyncCafeIndex(cafeId);

    return this.reviewRepo.findOne({
      where: { id: savedId },
      relations: ['user', 'ratings', 'media'],
    });
  }

  async update(userId: number, reviewId: number, dto: UpdateReviewDto) {
    const review = await this.reviewRepo.findOne({ where: { id: reviewId }, relations: ['ratings'] });
    if (!review) throw new NotFoundException('Review tidak ditemukan');
    if (review.userId !== userId) throw new ForbiddenException('Bukan review kamu');

    review.text = dto.text ?? null;
    await this.reviewRepo.save(review);

    // Replace ratings
    await this.ratingRepo.delete({ reviewId });
    if (dto.ratings?.length) {
      const ratings = dto.ratings.map((r) =>
        this.ratingRepo.create({ reviewId, category: r.category, score: r.score }),
      );
      await this.ratingRepo.save(ratings);
    }

    // Replace media
    this.validateMedia(dto.media);
    await this.mediaRepo.delete({ reviewId });
    if (dto.media?.length) {
      const mediaRows = dto.media.map((m, i) =>
        this.mediaRepo.create({
          reviewId,
          mediaType: m.mediaType,
          url: m.url,
          displayOrder: i,
        }),
      );
      await this.mediaRepo.save(mediaRows);
    }

    try {
      await this.aggregateCafeSignals(review.cafeId);
    } catch {}

    await this.resyncCafeIndex(review.cafeId);

    return this.reviewRepo.findOne({
      where: { id: reviewId },
      relations: ['user', 'ratings', 'media'],
    });
  }

  async delete(userId: number, reviewId: number) {
    const review = await this.reviewRepo.findOne({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('Review tidak ditemukan');
    if (review.userId !== userId) throw new ForbiddenException('Bukan review kamu');
    const cafeId = review.cafeId;
    await this.reviewRepo.remove(review);
    try {
      await this.aggregateCafeSignals(cafeId);
    } catch {}
    await this.resyncCafeIndex(cafeId);
  }

  async findByCafe(cafeId: number, page = 1, limit = 20) {
    const [data, total] = await this.reviewRepo.findAndCount({
      where: { cafeId },
      relations: ['user', 'ratings', 'media'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, meta: { page, limit, total } };
  }

  async summary(cafeId: number) {
    const rows: { category: string; avg_score: string; count: string }[] =
      await this.dataSource.query(
        `SELECT rr.category, AVG(rr.score) AS avg_score, COUNT(*) AS count
         FROM review_ratings rr
         JOIN reviews r ON r.id = rr.review_id
         WHERE r.cafe_id = ?
         GROUP BY rr.category`,
        [cafeId],
      );
    return rows.map((r) => ({
      category: r.category,
      avgScore: Math.round(parseFloat(r.avg_score) * 10) / 10,
      count: parseInt(r.count, 10),
    }));
  }

  async findByUser(userId: number) {
    return this.reviewRepo.find({
      where: { userId },
      relations: ['cafe', 'ratings', 'media'],
      order: { createdAt: 'DESC' },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Cafe signal aggregation
  //
  // Turns review mood_* and facility_* selections into cafe-level signals:
  //   * cafe_purpose_tags — boosts a cafe's score for a purpose when multiple
  //     reviewers tagged the same mood
  //   * cafe_facilities — adds a facility row when multiple reviewers tagged it
  //
  // This is additive to the scraping-based analysis. Scraped scores stay as a
  // baseline; review signals boost them on top.
  // ─────────────────────────────────────────────────────────────────────────

  /** Mood key (from review category) → cafe_purpose_tags.purpose_slug */
  private readonly MOOD_TO_PURPOSE_SLUG: Record<string, string> = {
    mood_me_time: 'me-time',
    'mood_me-time': 'me-time',
    mood_date: 'date',
    mood_family: 'family',
    mood_family_time: 'family',
    mood_group_study: 'group-work',
    'mood_group-work': 'group-work',
    mood_wfc: 'wfc',
  };

  /** Facility key (from review category) → cafe_facilities.facility_key */
  private readonly FACILITY_REVIEW_KEYS = new Set([
    'wifi', 'power_outlet', 'mushola', 'parking',
    'kid_friendly', 'quiet_atmosphere', 'large_tables', 'outdoor_area',
  ]);

  /** Min reviewers agreeing for a signal to be applied */
  private readonly SIGNAL_MIN_VOTES = 2;

  /**
   * Recompute cafe_purpose_tags and cafe_facilities from all reviews on
   * a cafe. Idempotent — safe to call after every review create/update/delete.
   *
   * Scraped scores are preserved: the review boost ADDS to whatever score
   * already exists in cafe_purpose_tags (capped at 100). Facilities from
   * reviews are ADDED but don't remove scraping-originated facilities.
   */
  private async aggregateCafeSignals(cafeId: number): Promise<void> {
    // 1. Count mood votes per purpose_slug (distinct users)
    const moodVotes: { category: string; votes: string }[] =
      await this.dataSource.query(
        `SELECT rr.category, COUNT(DISTINCT r.user_id) AS votes
         FROM review_ratings rr
         JOIN reviews r ON r.id = rr.review_id
         WHERE r.cafe_id = ? AND rr.category LIKE 'mood_%'
         GROUP BY rr.category`,
        [cafeId],
      );

    for (const m of moodVotes) {
      const slug = this.MOOD_TO_PURPOSE_SLUG[m.category];
      if (!slug) continue;
      const votes = parseInt(m.votes, 10);
      if (votes < this.SIGNAL_MIN_VOTES) continue;

      // Boost: each vote = +10 score (min 20 at 2 votes, cap 50)
      const boost = Math.min(50, votes * 10);

      // Read current scraped score (if any), apply boost, upsert
      const [existing] = await this.dataSource.query(
        `SELECT score FROM cafe_purpose_tags WHERE cafe_id = ? AND purpose_slug = ?`,
        [cafeId, slug],
      );
      const baseline = existing ? parseInt(existing.score, 10) : 0;
      // Final score is max(baseline, baseline_before_boost + boost). We assume
      // the stored score might already include a prior boost, so we use
      // max(existing, 40 + boost) as a conservative floor so votes always
      // promote the cafe above the 40-threshold used by filter logic.
      const finalScore = Math.min(100, Math.max(baseline, 40 + boost));

      await this.dataSource.query(
        `INSERT INTO cafe_purpose_tags (cafe_id, purpose_slug, score)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE score = GREATEST(score, VALUES(score))`,
        [cafeId, slug, finalScore],
      );
    }

    // 2. Count facility votes (distinct users)
    const facilityVotes: { category: string; votes: string }[] =
      await this.dataSource.query(
        `SELECT rr.category, COUNT(DISTINCT r.user_id) AS votes
         FROM review_ratings rr
         JOIN reviews r ON r.id = rr.review_id
         WHERE r.cafe_id = ? AND rr.category LIKE 'facility_%'
         GROUP BY rr.category`,
        [cafeId],
      );

    for (const f of facilityVotes) {
      const key = f.category.replace(/^facility_/, '');
      if (!this.FACILITY_REVIEW_KEYS.has(key)) continue;
      const votes = parseInt(f.votes, 10);
      if (votes < this.SIGNAL_MIN_VOTES) continue;

      // Check if already present (whether from scraping or previous aggregation)
      const [existing] = await this.dataSource.query(
        `SELECT id FROM cafe_facilities WHERE cafe_id = ? AND facility_key = ? LIMIT 1`,
        [cafeId, key],
      );
      if (!existing) {
        await this.dataSource.query(
          `INSERT INTO cafe_facilities (cafe_id, facility_key, facility_value)
           VALUES (?, ?, ?)`,
          [cafeId, key, `reviews:${votes}`],
        );
      }
      // If already exists, leave it alone — don't overwrite scraping metadata
    }

    // 3. Update has_mushola / has_parking / wifi_available flags on cafes
    //    row based on aggregated facilities (so filter wizard picks them up)
    const flagUpdates: { key: string; col: string }[] = [
      { key: 'wifi', col: 'wifi_available' },
      { key: 'mushola', col: 'has_mushola' },
      { key: 'parking', col: 'has_parking' },
    ];
    for (const { key, col } of flagUpdates) {
      const [f] = await this.dataSource.query(
        `SELECT 1 FROM cafe_facilities WHERE cafe_id = ? AND facility_key = ? LIMIT 1`,
        [cafeId, key],
      );
      if (f) {
        await this.dataSource.query(
          `UPDATE cafes SET ${col} = TRUE WHERE id = ? AND ${col} = FALSE`,
          [cafeId],
        );
      }
    }
  }
}
