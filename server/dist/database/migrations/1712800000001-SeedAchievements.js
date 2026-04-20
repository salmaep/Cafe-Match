"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeedAchievements1712800000001 = void 0;
const ACHIEVEMENTS = [
    { slug: 'first-checkin', name: 'Selamat Datang, Cafeholic!', description: 'Check-in pertama kamu di CafeMatch', category: 'visit_general', tier: 'bronze_1', threshold: 1 },
    { slug: 'checkin-10', name: 'Mulai Ketagihan', description: 'Sudah 10 kali check-in di berbagai cafe', category: 'visit_general', tier: 'bronze_2', threshold: 10 },
    { slug: 'checkin-25', name: 'Cafe Explorer', description: '25 check-in — kamu mulai jadi langganan!', category: 'visit_general', tier: 'silver_1', threshold: 25 },
    { slug: 'checkin-50', name: 'Pecinta Sejati Cafe', description: '50 check-in, kamu emang beda sih!', category: 'visit_general', tier: 'silver_2', threshold: 50 },
    { slug: 'checkin-100', name: 'Legenda Cafe', description: '100 check-in — respect!', category: 'visit_general', tier: 'gold_1', threshold: 100 },
    { slug: 'checkin-200', name: 'Sultan Nongkrong', description: '200 check-in, literally hidup di cafe', category: 'visit_general', tier: 'gold_2', threshold: 200 },
    { slug: 'checkin-500', name: 'Kafe Addict Platinum', description: '500 check-in — kamu sudah jadi legenda!', category: 'visit_general', tier: 'platinum', threshold: 500 },
    { slug: 'wfc-5-monthly', name: 'Si Paling WFC Junior Tingkat 1', description: '5 cafe WFC berbeda dalam sebulan', category: 'visit_purpose', tier: 'bronze_1', threshold: 5, purpose_slug: 'wfc' },
    { slug: 'wfc-10-monthly', name: 'Si Paling WFC Junior Tingkat 2', description: '10 cafe WFC berbeda dalam sebulan', category: 'visit_purpose', tier: 'silver_1', threshold: 10, purpose_slug: 'wfc' },
    { slug: 'wfc-20-monthly', name: 'Sultan WFC Senior Tingkat 1', description: '20 cafe WFC berbeda dalam sebulan!', category: 'visit_purpose', tier: 'gold_1', threshold: 20, purpose_slug: 'wfc' },
    { slug: 'me-time-5-monthly', name: 'Si Paling Me Time Junior Tingkat 1', description: '5 cafe Me Time berbeda dalam sebulan', category: 'visit_purpose', tier: 'bronze_1', threshold: 5, purpose_slug: 'me-time' },
    { slug: 'me-time-10-monthly', name: 'Si Paling Me Time Junior Tingkat 2', description: '10 cafe Me Time berbeda dalam sebulan', category: 'visit_purpose', tier: 'silver_1', threshold: 10, purpose_slug: 'me-time' },
    { slug: 'me-time-20-monthly', name: 'Petualang Me Time Senior', description: '20 cafe Me Time berbeda dalam sebulan!', category: 'visit_purpose', tier: 'gold_1', threshold: 20, purpose_slug: 'me-time' },
    { slug: 'date-5-monthly', name: 'Si Romantis Junior Tingkat 1', description: '5 cafe Date berbeda dalam sebulan', category: 'visit_purpose', tier: 'bronze_1', threshold: 5, purpose_slug: 'date' },
    { slug: 'date-10-monthly', name: 'Si Romantis Junior Tingkat 2', description: '10 cafe Date berbeda dalam sebulan', category: 'visit_purpose', tier: 'silver_1', threshold: 10, purpose_slug: 'date' },
    { slug: 'date-20-monthly', name: 'Raja Romantis Senior', description: '20 cafe Date berbeda dalam sebulan!', category: 'visit_purpose', tier: 'gold_1', threshold: 20, purpose_slug: 'date' },
    { slug: 'family-5-monthly', name: 'Family Man Junior Tingkat 1', description: '5 cafe Family berbeda dalam sebulan', category: 'visit_purpose', tier: 'bronze_1', threshold: 5, purpose_slug: 'family' },
    { slug: 'family-10-monthly', name: 'Family Man Junior Tingkat 2', description: '10 cafe Family berbeda dalam sebulan', category: 'visit_purpose', tier: 'silver_1', threshold: 10, purpose_slug: 'family' },
    { slug: 'group-5-monthly', name: 'Si Rajin Junior Tingkat 1', description: '5 cafe Group Study berbeda dalam sebulan', category: 'visit_purpose', tier: 'bronze_1', threshold: 5, purpose_slug: 'group-work' },
    { slug: 'group-10-monthly', name: 'Si Rajin Junior Tingkat 2', description: '10 cafe Group Study berbeda dalam sebulan', category: 'visit_purpose', tier: 'silver_1', threshold: 10, purpose_slug: 'group-work' },
    { slug: 'streak-3', name: 'Api Menyala!', description: 'Streak 3 minggu berturut-turut', category: 'streak', tier: 'bronze_1', threshold: 3 },
    { slug: 'streak-8', name: 'Api Membara', description: 'Streak 8 minggu berturut-turut', category: 'streak', tier: 'silver_1', threshold: 8 },
    { slug: 'streak-16', name: 'Api Abadi', description: 'Streak 16 minggu — tak terpadamkan!', category: 'streak', tier: 'gold_1', threshold: 16 },
    { slug: 'first-friend', name: 'Teman Pertama', description: 'Tambah teman pertama di CafeMatch', category: 'social', tier: 'bronze_1', threshold: 1 },
    { slug: 'friends-5', name: 'Gaul Abis', description: 'Punya 5 teman di CafeMatch', category: 'social', tier: 'bronze_2', threshold: 5 },
    { slug: 'friends-10', name: 'Influencer Kafe', description: 'Punya 10 teman di CafeMatch', category: 'social', tier: 'silver_1', threshold: 10 },
    { slug: 'first-review', name: 'Si Paling Review', description: 'Tulis review pertama kamu', category: 'social', tier: 'bronze_1', threshold: 1 },
    { slug: 'reviews-10', name: 'Food Critic Handal', description: 'Sudah menulis 10 review', category: 'social', tier: 'silver_1', threshold: 10 },
];
class SeedAchievements1712800000001 {
    async up(queryRunner) {
        for (const a of ACHIEVEMENTS) {
            const existing = await queryRunner.query(`SELECT id FROM achievements WHERE slug = ?`, [a.slug]);
            if (existing.length > 0)
                continue;
            await queryRunner.query(`INSERT INTO achievements (slug, name, description, category, tier, threshold, purpose_slug)
         VALUES (?, ?, ?, ?, ?, ?, ?)`, [
                a.slug,
                a.name,
                a.description,
                a.category,
                a.tier,
                a.threshold,
                a.purpose_slug ?? null,
            ]);
        }
        console.log(`Seeded ${ACHIEVEMENTS.length} achievement definitions`);
    }
    async down(queryRunner) {
        const slugs = ACHIEVEMENTS.map((a) => `'${a.slug}'`).join(',');
        await queryRunner.query(`DELETE FROM achievements WHERE slug IN (${slugs})`);
    }
}
exports.SeedAchievements1712800000001 = SeedAchievements1712800000001;
//# sourceMappingURL=1712800000001-SeedAchievements.js.map