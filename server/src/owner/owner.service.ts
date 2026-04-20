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

    const cafe = this.cafesRepo.create({
      name: dto.name,
      slug,
      address: dto.address,
      phone: dto.phone || null,
      description: dto.description || null,
      latitude: dto.latitude || -6.8965,
      longitude: dto.longitude || 107.591,
      ownerId: userId,
      googleMapsUrl: `https://www.google.com/maps?q=${dto.latitude || -6.8965},${dto.longitude || 107.591}`,
    } as Partial<Cafe>);

    return this.cafesRepo.save(cafe);
  }

  async updateCafe(userId: number, dto: UpdateCafeDto): Promise<Cafe> {
    const cafe = await this.requireOwnerCafe(userId);
    Object.assign(cafe, dto);
    if (dto.latitude || dto.longitude) {
      cafe.googleMapsUrl = `https://www.google.com/maps?q=${cafe.latitude},${cafe.longitude}`;
    }
    return this.cafesRepo.save(cafe);
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
