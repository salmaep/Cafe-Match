import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AchievementsService } from './achievements.service';
import { POINT_VALUES, PointEventType } from './points.constants';

/**
 * Persistent points ledger. point_events is the source of truth; users.points
 * is a cached total updated in the same transaction. Awards are idempotent
 * via dedupe_key (unique index) — calling award() twice with the same key is
 * a safe no-op, which lets hooks fire from multiple code paths.
 */
@Injectable()
export class PointsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly achievementsService: AchievementsService,
  ) {}

  /**
   * Award points for an event. Returns the user's new total, or null when the
   * dedupe key already exists (already awarded).
   */
  async award(
    userId: number,
    eventType: PointEventType,
    dedupeKey: string | null,
    meta?: Record<string, unknown>,
  ): Promise<number | null> {
    const points = POINT_VALUES[eventType];
    if (!points) return null;

    let total: number | null = null;
    try {
      await this.dataSource.transaction(async (em) => {
        await em.query(
          `INSERT INTO point_events (user_id, event_type, points, dedupe_key, meta)
           VALUES (?, ?, ?, ?, ?)`,
          [
            userId,
            eventType,
            points,
            dedupeKey,
            meta ? JSON.stringify(meta) : null,
          ],
        );
        await em.query(`UPDATE users SET points = points + ? WHERE id = ?`, [
          points,
          userId,
        ]);
        const [row] = await em.query(
          `SELECT points FROM users WHERE id = ?`,
          [userId],
        );
        total = row ? Number(row.points) : null;
      });
    } catch (err: any) {
      const code = err?.code ?? err?.driverError?.code;
      if (code === 'ER_DUP_ENTRY') return null; // already awarded
      throw err;
    }

    if (total != null) {
      try {
        await this.achievementsService.checkPointsAchievements(userId, total);
      } catch (err: any) {
        console.warn('[points] achievement check failed:', err?.message);
      }
    }
    return total;
  }

  /** Points total + recent ledger entries for the profile screen. */
  async getSummary(userId: number) {
    const [totalRow] = await this.dataSource.query(
      `SELECT points FROM users WHERE id = ?`,
      [userId],
    );
    const recent = await this.dataSource.query(
      `SELECT event_type AS eventType, points, meta, created_at AS createdAt
       FROM point_events
       WHERE user_id = ?
       ORDER BY created_at DESC, id DESC
       LIMIT 20`,
      [userId],
    );
    return {
      total: totalRow ? Number(totalRow.points) : 0,
      recent,
    };
  }
}
