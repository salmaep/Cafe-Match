import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Cafe } from '../cafes/entities/cafe.entity';
import { CafeMenu } from '../menus/entities/cafe-menu.entity';
import { CafePhoto } from '../photos/entities/cafe-photo.entity';
import { CafeFacility } from '../cafes/entities/cafe-facility.entity';
import { Promotion } from '../promotions/entities/promotion.entity';
import { CafeAnalytics } from '../analytics/entities/cafe-analytics.entity';
import { UpdateCafeDto, CreateOwnerCafeDto, UpdateMenuItemDto } from './dto/update-cafe.dto';

@Injectable()
export class OwnerService {
  constructor(
    @InjectRepository(Cafe)
    private readonly cafesRepo: Repository<Cafe>,
    @InjectRepository(CafeMenu)
    private readonly menusRepo: Repository<CafeMenu>,
    @InjectRepository(CafePhoto)
    private readonly photosRepo: Repository<CafePhoto>,
    @InjectRepository(CafeFacility)
    private readonly facilitiesRepo: Repository<CafeFacility>,
    @InjectRepository(Promotion)
    private readonly promotionsRepo: Repository<Promotion>,
    @InjectRepository(CafeAnalytics)
    private readonly analyticsRepo: Repository<CafeAnalytics>,
    private readonly dataSource: DataSource,
  ) {}

  async getOwnerCafe(userId: number): Promise<Cafe | null> {
    // Prefer a cafe that has an active promotion (so dashboard shows promo data).
    // If none, fall back to the cafe with any promotion. Else just the first owned cafe.
    const cafesWithActive: any[] = await this.dataSource.query(
      `SELECT c.id FROM cafes c
       JOIN promotions p ON p.cafe_id = c.id AND p.status = 'active'
       WHERE c.owner_id = ?
       LIMIT 1`,
      [userId],
    );
    if (cafesWithActive.length > 0) {
      return this.cafesRepo.findOne({
        where: { id: cafesWithActive[0].id },
        relations: ['facilities', 'menus', 'photos'],
      });
    }

    const cafesWithAnyPromo: any[] = await this.dataSource.query(
      `SELECT c.id FROM cafes c
       JOIN promotions p ON p.cafe_id = c.id
       WHERE c.owner_id = ?
       ORDER BY p.created_at DESC
       LIMIT 1`,
      [userId],
    );
    if (cafesWithAnyPromo.length > 0) {
      return this.cafesRepo.findOne({
        where: { id: cafesWithAnyPromo[0].id },
        relations: ['facilities', 'menus', 'photos'],
      });
    }

    return this.cafesRepo.findOne({
      where: { ownerId: userId },
      relations: ['facilities', 'menus', 'photos'],
    });
  }

  async createCafe(userId: number, dto: CreateOwnerCafeDto): Promise<Cafe> {
    const existing = await this.cafesRepo.findOne({ where: { ownerId: userId } });
    if (existing) {
      throw new ConflictException('You already have a cafe registered');
    }

    const slug = dto.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim() + '-' + Date.now().toString(36);

    const lat = dto.latitude ?? -6.9175;
    const lng = dto.longitude ?? 107.6191;

    // Raw INSERT — TypeORM doesn't map the spatial `location` column, but the
    // table requires it (NOT NULL POINT). Build the POINT from lat/lng.
    const result: any = await this.cafesRepo.query(
      `INSERT INTO cafes (
         name, slug, address, phone, description,
         latitude, longitude, location,
         owner_id, google_maps_url, price_range, is_active,
         wifi_available, has_mushola, has_parking,
         has_active_promotion, bookmarks_count, favorites_count
       ) VALUES (?, ?, ?, ?, ?,
         ?, ?, ST_PointFromText(CONCAT('POINT(', ?, ' ', ?, ')'), 4326),
         ?, ?, '$$', TRUE,
         FALSE, FALSE, FALSE,
         FALSE, 0, 0)`,
      [
        dto.name,
        slug,
        dto.address,
        dto.phone || null,
        dto.description || null,
        lat,
        lng,
        lng, // POINT order: (lng lat)
        lat,
        userId,
        `https://maps.google.com/?q=${lat},${lng}`,
      ],
    );

    const insertedId = result?.insertId;
    const cafe = await this.cafesRepo.findOne({ where: { id: insertedId } });
    if (!cafe) throw new ConflictException('Failed to create cafe');
    return cafe;
  }

  async updateCafe(userId: number, dto: UpdateCafeDto): Promise<Cafe> {
    const cafe = await this.requireOwnerCafe(userId);
    Object.assign(cafe, dto);
    if (dto.latitude != null || dto.longitude != null) {
      cafe.googleMapsUrl = `https://www.google.com/maps?q=${cafe.latitude},${cafe.longitude}`;
    }
    const saved = await this.cafesRepo.save(cafe);

    // Keep the spatial `location` column in sync with lat/lng for distance
    // queries. Done via raw query because TypeORM doesn't map this column.
    if (dto.latitude != null || dto.longitude != null) {
      await this.cafesRepo.query(
        `UPDATE cafes SET location = ST_PointFromText(CONCAT('POINT(', ?, ' ', ?, ')'), 4326) WHERE id = ?`,
        [saved.longitude, saved.latitude, saved.id],
      );
    }
    return saved;
  }

  async updateMenus(userId: number, items: UpdateMenuItemDto[]): Promise<CafeMenu[]> {
    const cafe = await this.requireOwnerCafe(userId);

    // Delete existing menus and replace
    await this.menusRepo.delete({ cafeId: cafe.id });

    const newMenus = items.map((item) =>
      this.menusRepo.create({
        cafeId: cafe.id,
        category: item.category,
        itemName: item.itemName,
        price: item.price,
        description: item.description || null,
        isAvailable: item.isAvailable ?? true,
      } as Partial<CafeMenu>),
    );

    return this.menusRepo.save(newMenus);
  }

  async getDashboard(userId: number) {
    const cafe = await this.getOwnerCafe(userId);
    if (!cafe) {
      return { hasCafe: false };
    }

    // Prefer active, then pending_review, then pending_payment, else any latest
    let activePromotion = await this.promotionsRepo.findOne({
      where: { cafeId: cafe.id, status: 'active' },
      relations: ['package'],
      order: { createdAt: 'DESC' },
    });
    if (!activePromotion) {
      activePromotion = await this.promotionsRepo.findOne({
        where: { cafeId: cafe.id, status: 'pending_review' },
        relations: ['package'],
        order: { createdAt: 'DESC' },
      });
    }
    if (!activePromotion) {
      activePromotion = await this.promotionsRepo.findOne({
        where: { cafeId: cafe.id, status: 'pending_payment' },
        relations: ['package'],
        order: { createdAt: 'DESC' },
      });
    }
    if (!activePromotion) {
      // Fall back to the latest promotion of any status (expired/rejected)
      activePromotion = await this.promotionsRepo.findOne({
        where: { cafeId: cafe.id },
        relations: ['package'],
        order: { createdAt: 'DESC' },
      });
    }

    // Pending promotions
    const pendingPromotions = await this.promotionsRepo.find({
      where: { cafeId: cafe.id, status: 'pending_review' },
    });

    // Analytics summary (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [analyticsRaw] = await this.dataSource.query(
      `SELECT
        COALESCE(SUM(event_type = 'view'), 0) AS totalViews,
        COALESCE(SUM(event_type = 'click'), 0) AS totalClicks
       FROM cafe_analytics
       WHERE cafe_id = ? AND created_at >= ?`,
      [cafe.id, thirtyDaysAgo],
    );

    return {
      hasCafe: true,
      cafe: {
        id: cafe.id,
        name: cafe.name,
        bookmarksCount: cafe.bookmarksCount,
        favoritesCount: cafe.favoritesCount,
      },
      analytics: {
        totalViews: Number(analyticsRaw?.totalViews || 0),
        totalClicks: Number(analyticsRaw?.totalClicks || 0),
      },
      activePromotion: activePromotion
        ? {
            id: activePromotion.id,
            type: activePromotion.type,
            packageName: activePromotion.package?.name,
            expiresAt: activePromotion.expiresAt,
            daysRemaining: activePromotion.expiresAt
              ? Math.max(0, Math.ceil((new Date(activePromotion.expiresAt).getTime() - Date.now()) / 86400000))
              : null,
            status: activePromotion.status,
          }
        : null,
      pendingCount: pendingPromotions.length,
    };
  }

  private async requireOwnerCafe(userId: number): Promise<Cafe> {
    const cafe = await this.cafesRepo.findOne({ where: { ownerId: userId } });
    if (!cafe) {
      throw new NotFoundException('No cafe found. Please register your cafe first.');
    }
    return cafe;
  }
}
