import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Geser achievements wave 2 — points ladder, tables, explorer, time-of-day,
 * extra social/streak rungs, and hook-awarded specials.
 *
 * Conventions (must hold, enforced by AchievementsService):
 * - purpose_slug doubles as a generic metric key for the new categories:
 *   table_host / table_join / table_squad / explorer_cafes / explorer_district /
 *   time_morning / time_night / time_weekend.
 * - Slugs outside category 'social' must NOT contain the substrings "friend"
 *   or "review" (checkSocialAchievements matches on them).
 * - category 'special' rows are awarded directly by slug from feature hooks
 *   (threshold 1, progress set to 1 on award).
 */
const ACHIEVEMENTS: Array<{
  slug: string;
  name: string;
  description: string;
  category: string;
  tier: string;
  threshold: number;
  purpose_slug?: string;
}> = [
  // ── Points ladder (users.points total) ────────────────────────────────────
  { slug: 'points-50', name: 'Coffee Lover', description: 'Kumpulin 50 poin pertama kamu', category: 'points', tier: 'bronze_1', threshold: 50 },
  { slug: 'points-100', name: 'Penikmat Kopi', description: '100 poin — makin rajin nongkrong', category: 'points', tier: 'bronze_2', threshold: 100 },
  { slug: 'points-250', name: 'Anak Kafe Sejati', description: '250 poin, kafe udah kerasa rumah kedua', category: 'points', tier: 'silver_1', threshold: 250 },
  { slug: 'points-500', name: 'Kolektor Codex', description: '500 poin terkumpul!', category: 'points', tier: 'silver_2', threshold: 500 },
  { slug: 'points-1000', name: 'Sultan Poin', description: '1.000 poin — level sultan', category: 'points', tier: 'gold_1', threshold: 1000 },
  { slug: 'points-2500', name: 'Legenda Geser', description: '2.500 poin, namamu terukir di Geser', category: 'points', tier: 'gold_2', threshold: 2500 },
  { slug: 'points-5000', name: 'Master Nongkrong', description: '5.000 poin — tidak terbendung', category: 'points', tier: 'platinum', threshold: 5000 },
  { slug: 'points-10000', name: 'Dewa Kafein', description: '10.000 poin, nggak ada obat', category: 'points', tier: 'platinum', threshold: 10000 },

  // ── Tables: hosting (metric table_host) ───────────────────────────────────
  { slug: 'table-host-1', name: 'Tuan Rumah Pemula', description: 'Buka meja pertamamu', category: 'table', tier: 'bronze_1', threshold: 1, purpose_slug: 'table_host' },
  { slug: 'table-host-5', name: 'Tukang Ngajak', description: '5 kali buka meja', category: 'table', tier: 'bronze_2', threshold: 5, purpose_slug: 'table_host' },
  { slug: 'table-host-10', name: 'Host Andalan', description: '10 kali buka meja', category: 'table', tier: 'silver_1', threshold: 10, purpose_slug: 'table_host' },
  { slug: 'table-host-25', name: 'Bos Meja', description: '25 kali buka meja', category: 'table', tier: 'gold_1', threshold: 25, purpose_slug: 'table_host' },
  { slug: 'table-host-50', name: 'Sesepuh Meja', description: '50 kali buka meja', category: 'table', tier: 'gold_2', threshold: 50, purpose_slug: 'table_host' },
  { slug: 'table-host-100', name: 'Raja Meja Geser', description: '100 kali buka meja — luar biasa!', category: 'table', tier: 'platinum', threshold: 100, purpose_slug: 'table_host' },

  // ── Tables: joining (metric table_join, accepted as guest) ────────────────
  { slug: 'table-join-1', name: 'Berani Nyapa', description: 'Gabung meja orang untuk pertama kali', category: 'table', tier: 'bronze_1', threshold: 1, purpose_slug: 'table_join' },
  { slug: 'table-join-5', name: 'Gampang Akrab', description: 'Gabung 5 meja', category: 'table', tier: 'bronze_2', threshold: 5, purpose_slug: 'table_join' },
  { slug: 'table-join-10', name: 'Teman Semeja', description: 'Gabung 10 meja', category: 'table', tier: 'silver_1', threshold: 10, purpose_slug: 'table_join' },
  { slug: 'table-join-25', name: 'Si Paling Supel', description: 'Gabung 25 meja', category: 'table', tier: 'gold_1', threshold: 25, purpose_slug: 'table_join' },
  { slug: 'table-join-50', name: 'Sahabat Semua Meja', description: 'Gabung 50 meja', category: 'table', tier: 'gold_2', threshold: 50, purpose_slug: 'table_join' },
  { slug: 'table-join-100', name: 'Ikon Komunitas', description: 'Gabung 100 meja!', category: 'table', tier: 'platinum', threshold: 100, purpose_slug: 'table_join' },

  // ── Tables: squad sessions (≥4 tamu diterima, metric table_squad) ─────────
  { slug: 'table-squad-1', name: 'Rame-Rame Seru', description: 'Meja kamu penuh 4 orang atau lebih', category: 'table', tier: 'silver_1', threshold: 1, purpose_slug: 'table_squad' },
  { slug: 'table-squad-5', name: 'Magnet Tongkrongan', description: '5 sesi meja rame', category: 'table', tier: 'silver_2', threshold: 5, purpose_slug: 'table_squad' },
  { slug: 'table-squad-10', name: 'Kapten Nongkrong', description: '10 sesi meja rame', category: 'table', tier: 'gold_2', threshold: 10, purpose_slug: 'table_squad' },
  { slug: 'table-squad-25', name: 'Panglima Meja', description: '25 sesi meja rame — legendaris', category: 'table', tier: 'platinum', threshold: 25, purpose_slug: 'table_squad' },

  // ── Explorer: distinct cafes visited (metric explorer_cafes) ──────────────
  { slug: 'explorer-cafes-5', name: 'Mulai Menjelajah', description: 'Check-in di 5 kafe berbeda', category: 'explorer', tier: 'bronze_1', threshold: 5, purpose_slug: 'explorer_cafes' },
  { slug: 'explorer-cafes-10', name: 'Pemburu Kafe', description: 'Check-in di 10 kafe berbeda', category: 'explorer', tier: 'bronze_2', threshold: 10, purpose_slug: 'explorer_cafes' },
  { slug: 'explorer-cafes-25', name: 'Penjelajah Kafe', description: 'Check-in di 25 kafe berbeda', category: 'explorer', tier: 'silver_2', threshold: 25, purpose_slug: 'explorer_cafes' },
  { slug: 'explorer-cafes-50', name: 'Kartografer Kopi', description: 'Check-in di 50 kafe berbeda', category: 'explorer', tier: 'gold_1', threshold: 50, purpose_slug: 'explorer_cafes' },
  { slug: 'explorer-cafes-100', name: 'Atlas Kafe Berjalan', description: 'Check-in di 100 kafe berbeda', category: 'explorer', tier: 'gold_2', threshold: 100, purpose_slug: 'explorer_cafes' },
  { slug: 'explorer-cafes-200', name: 'Penakluk Semua Kafe', description: 'Check-in di 200 kafe berbeda!', category: 'explorer', tier: 'platinum', threshold: 200, purpose_slug: 'explorer_cafes' },

  // ── Explorer: distinct districts (metric explorer_district) ───────────────
  { slug: 'explorer-district-3', name: 'Keliling Tetangga', description: 'Ngopi di 3 kecamatan berbeda', category: 'explorer', tier: 'bronze_2', threshold: 3, purpose_slug: 'explorer_district' },
  { slug: 'explorer-district-5', name: 'Lintas Kecamatan', description: 'Ngopi di 5 kecamatan berbeda', category: 'explorer', tier: 'silver_1', threshold: 5, purpose_slug: 'explorer_district' },
  { slug: 'explorer-district-10', name: 'Penjelajah Kota', description: 'Ngopi di 10 kecamatan berbeda', category: 'explorer', tier: 'gold_1', threshold: 10, purpose_slug: 'explorer_district' },
  { slug: 'explorer-district-15', name: 'Sudah Keliling Kota', description: 'Ngopi di 15 kecamatan berbeda', category: 'explorer', tier: 'gold_2', threshold: 15, purpose_slug: 'explorer_district' },

  // ── Time of day: morning (< 09:00, metric time_morning) ───────────────────
  { slug: 'time-morning-5', name: 'Ngopi Pagi', description: '5 check-in sebelum jam 9 pagi', category: 'time', tier: 'bronze_2', threshold: 5, purpose_slug: 'time_morning' },
  { slug: 'time-morning-25', name: 'Kaum Subuh', description: '25 check-in sebelum jam 9 pagi', category: 'time', tier: 'silver_2', threshold: 25, purpose_slug: 'time_morning' },
  { slug: 'time-morning-100', name: 'Penguasa Pagi', description: '100 check-in sebelum jam 9 pagi', category: 'time', tier: 'platinum', threshold: 100, purpose_slug: 'time_morning' },

  // ── Time of day: night (>= 21:00, metric time_night) ──────────────────────
  { slug: 'time-night-5', name: 'Begadang Tipis', description: '5 check-in setelah jam 9 malam', category: 'time', tier: 'bronze_2', threshold: 5, purpose_slug: 'time_night' },
  { slug: 'time-night-25', name: 'Nokturnal', description: '25 check-in setelah jam 9 malam', category: 'time', tier: 'silver_2', threshold: 25, purpose_slug: 'time_night' },
  { slug: 'time-night-100', name: 'Penjaga Malam', description: '100 check-in setelah jam 9 malam', category: 'time', tier: 'platinum', threshold: 100, purpose_slug: 'time_night' },

  // ── Time of day: weekend (metric time_weekend) ────────────────────────────
  { slug: 'time-weekend-5', name: 'Weekend Santai', description: '5 check-in di akhir pekan', category: 'time', tier: 'bronze_2', threshold: 5, purpose_slug: 'time_weekend' },
  { slug: 'time-weekend-25', name: 'Anak Weekend', description: '25 check-in di akhir pekan', category: 'time', tier: 'silver_2', threshold: 25, purpose_slug: 'time_weekend' },
  { slug: 'time-weekend-100', name: 'Weekend Warrior', description: '100 check-in di akhir pekan', category: 'time', tier: 'platinum', threshold: 100, purpose_slug: 'time_weekend' },

  // ── Social: extra friend rungs (slug HARUS mengandung "friend") ───────────
  { slug: 'friend-25', name: 'Lingkaran Luas', description: 'Punya 25 teman di Geser', category: 'social', tier: 'silver_2', threshold: 25 },
  { slug: 'friend-50', name: 'Semua Kenal Kamu', description: 'Punya 50 teman di Geser', category: 'social', tier: 'gold_1', threshold: 50 },
  { slug: 'friend-100', name: 'Selebriti Geser', description: 'Punya 100 teman di Geser', category: 'social', tier: 'platinum', threshold: 100 },

  // ── Social: extra review rungs (slug HARUS mengandung "review") ───────────
  { slug: 'review-25', name: 'Kritikus Kafe', description: 'Menulis 25 review', category: 'social', tier: 'silver_2', threshold: 25 },
  { slug: 'review-50', name: 'Suara Komunitas', description: 'Menulis 50 review', category: 'social', tier: 'gold_1', threshold: 50 },
  { slug: 'review-100', name: 'Ensiklopedia Rasa', description: 'Menulis 100 review', category: 'social', tier: 'platinum', threshold: 100 },

  // ── Streak: extra rungs ────────────────────────────────────────────────────
  { slug: 'streak-25', name: 'Setia Banget', description: 'Streak check-in 25', category: 'streak', tier: 'gold_1', threshold: 25 },
  { slug: 'streak-52', name: 'Ritual Mingguan', description: 'Streak check-in 52', category: 'streak', tier: 'gold_2', threshold: 52 },
  { slug: 'streak-100', name: 'Tak Terhentikan', description: 'Streak check-in 100!', category: 'streak', tier: 'platinum', threshold: 100 },

  // ── Special (awarded by slug from feature hooks, threshold 1) ─────────────
  { slug: 'special-night-owl-table', name: 'Meja Tengah Malam', description: 'Buka meja setelah jam 9 malam', category: 'special', tier: 'bronze_2', threshold: 1 },
  { slug: 'special-early-table', name: 'Meja Pagi Buta', description: 'Buka meja sebelum jam 9 pagi', category: 'special', tier: 'bronze_2', threshold: 1 },
  { slug: 'special-full-house', name: 'Full House', description: 'Meja kamu terisi penuh sampai kapasitas maksimal', category: 'special', tier: 'gold_1', threshold: 1 },
  { slug: 'special-weekend-squad', name: 'Squad Akhir Pekan', description: 'Meja rame (4+ orang) di akhir pekan', category: 'special', tier: 'silver_2', threshold: 1 },
  { slug: 'special-profile-complete', name: 'Identitas Lengkap', description: 'Lengkapi username, bio, gender, dan foto profil', category: 'special', tier: 'bronze_1', threshold: 1 },
];

export class SeedGeserAchievements1716140000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const a of ACHIEVEMENTS) {
      const existing = await queryRunner.query(
        `SELECT id FROM achievements WHERE slug = ?`,
        [a.slug],
      );
      if (existing.length > 0) continue;

      await queryRunner.query(
        `INSERT INTO achievements (slug, name, description, category, tier, threshold, purpose_slug)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          a.slug,
          a.name,
          a.description,
          a.category,
          a.tier,
          a.threshold,
          a.purpose_slug ?? null,
        ],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const slugs = ACHIEVEMENTS.map((a) => `'${a.slug}'`).join(',');
    await queryRunner.query(`DELETE FROM achievements WHERE slug IN (${slugs})`);
  }
}
