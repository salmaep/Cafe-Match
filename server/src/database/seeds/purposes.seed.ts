import { DataSource } from 'typeorm';
import { Purpose } from '../../purposes/entities/purpose.entity';
import { PurposeRequirement } from '../../purposes/entities/purpose-requirement.entity';

export async function seedPurposes(dataSource: DataSource): Promise<void> {
  const purposeRepo = dataSource.getRepository(Purpose);
  const requirementRepo = dataSource.getRepository(PurposeRequirement);

  const purposes = [
    {
      slug: 'me-time',
      name: 'Me Time',
      description: 'Quiet, cozy places perfect for solo relaxation',
      icon: 'coffee',
      displayOrder: 1,
      requirements: [
        { featureName: 'quiet_atmosphere', isMandatory: true, weight: 5 },
        { featureName: 'cozy_seating', isMandatory: false, weight: 4 },
        { featureName: 'outdoor_seating', isMandatory: false, weight: 2 },
      ],
    },
    {
      slug: 'date',
      name: 'Date',
      description: 'Romantic spots with great ambiance for couples',
      icon: 'heart',
      displayOrder: 2,
      requirements: [
        { featureName: 'ambient_lighting', isMandatory: true, weight: 5 },
        { featureName: 'intimate_seating', isMandatory: true, weight: 5 },
        { featureName: 'quiet_atmosphere', isMandatory: false, weight: 3 },
        { featureName: 'outdoor_seating', isMandatory: false, weight: 2 },
      ],
    },
    {
      slug: 'family',
      name: 'Family Time',
      description: 'Kid-friendly, spacious places for the whole family',
      icon: 'users',
      displayOrder: 3,
      requirements: [
        { featureName: 'kid_friendly', isMandatory: true, weight: 5 },
        { featureName: 'spacious', isMandatory: true, weight: 4 },
        { featureName: 'noise_tolerant', isMandatory: false, weight: 3 },
        { featureName: 'parking', isMandatory: false, weight: 3 },
      ],
    },
    {
      slug: 'group-work',
      name: 'Group Work / Study',
      description: 'Spaces with large tables and meeting facilities',
      icon: 'book-open',
      displayOrder: 4,
      requirements: [
        { featureName: 'large_tables', isMandatory: true, weight: 5 },
        { featureName: 'strong_wifi', isMandatory: true, weight: 4 },
        { featureName: 'power_outlets', isMandatory: false, weight: 3 },
        { featureName: 'whiteboard', isMandatory: false, weight: 3 },
        { featureName: 'bookable_space', isMandatory: false, weight: 2 },
      ],
    },
    {
      slug: 'wfc',
      name: 'Work from Cafe',
      description: 'Reliable WiFi, power outlets, and a quiet environment',
      icon: 'laptop',
      displayOrder: 5,
      requirements: [
        { featureName: 'strong_wifi', isMandatory: true, weight: 5 },
        { featureName: 'power_outlets', isMandatory: true, weight: 5 },
        { featureName: 'quiet_atmosphere', isMandatory: false, weight: 3 },
        { featureName: 'large_tables', isMandatory: false, weight: 2 },
        { featureName: 'cozy_seating', isMandatory: false, weight: 1 },
      ],
    },
    {
      slug: 'meeting',
      name: 'Meeting',
      description: 'Quiet, bookable spots for client or team meetings',
      icon: 'briefcase',
      displayOrder: 6,
      requirements: [
        { featureName: 'bookable_space', isMandatory: false, weight: 4 },
        { featureName: 'strong_wifi', isMandatory: true, weight: 5 },
        { featureName: 'quiet_atmosphere', isMandatory: false, weight: 4 },
        { featureName: 'large_tables', isMandatory: false, weight: 3 },
        { featureName: 'power_outlets', isMandatory: false, weight: 2 },
      ],
    },
    {
      slug: 'brainstorm',
      name: 'Brainstorm',
      description: 'Open-space cafes ideal for creative collaboration',
      icon: 'lightbulb',
      displayOrder: 7,
      requirements: [
        { featureName: 'large_tables', isMandatory: true, weight: 5 },
        { featureName: 'whiteboard', isMandatory: false, weight: 4 },
        { featureName: 'spacious', isMandatory: false, weight: 4 },
        { featureName: 'noise_tolerant', isMandatory: false, weight: 3 },
        { featureName: 'strong_wifi', isMandatory: false, weight: 2 },
      ],
    },
    {
      slug: 'catch-up',
      name: 'Catch Up',
      description: 'Relaxed cafes perfect for chatting with old friends',
      icon: 'coffee-cup',
      displayOrder: 8,
      requirements: [
        { featureName: 'cozy_seating', isMandatory: true, weight: 5 },
        { featureName: 'noise_tolerant', isMandatory: false, weight: 3 },
        { featureName: 'outdoor_seating', isMandatory: false, weight: 3 },
        { featureName: 'ambient_lighting', isMandatory: false, weight: 2 },
      ],
    },
    {
      slug: 'reading',
      name: 'Reading',
      description: 'Quiet corners with cozy seating for solo reading',
      icon: 'book',
      displayOrder: 9,
      requirements: [
        { featureName: 'quiet_atmosphere', isMandatory: true, weight: 5 },
        { featureName: 'cozy_seating', isMandatory: false, weight: 4 },
        { featureName: 'ambient_lighting', isMandatory: false, weight: 3 },
        { featureName: 'power_outlets', isMandatory: false, weight: 1 },
      ],
    },
    {
      slug: 'celebration',
      name: 'Celebration',
      description: 'Spacious, vibrant cafes for birthdays & special moments',
      icon: 'party',
      displayOrder: 10,
      requirements: [
        { featureName: 'spacious', isMandatory: true, weight: 5 },
        { featureName: 'large_tables', isMandatory: false, weight: 4 },
        { featureName: 'outdoor_seating', isMandatory: false, weight: 3 },
        { featureName: 'noise_tolerant', isMandatory: false, weight: 3 },
        { featureName: 'ambient_lighting', isMandatory: false, weight: 2 },
      ],
    },
    {
      slug: 'quick-coffee',
      name: 'Quick Coffee',
      description: 'Grab-and-go spots for a fast caffeine fix',
      icon: 'zap',
      displayOrder: 11,
      requirements: [
        // No mandatory — any cafe with seating qualifies. Score driven by amenities.
        { featureName: 'cozy_seating', isMandatory: false, weight: 3 },
        { featureName: 'parking', isMandatory: false, weight: 3 },
        { featureName: 'payment_qris', isMandatory: false, weight: 2 },
        { featureName: 'payment_ewallet', isMandatory: false, weight: 2 },
      ],
    },
    {
      slug: 'photo-spot',
      name: 'Photo Spot',
      description: 'Aesthetic cafes — perfect lighting & instagrammable spots',
      icon: 'camera',
      displayOrder: 12,
      requirements: [
        { featureName: 'ambient_lighting', isMandatory: true, weight: 5 },
        { featureName: 'outdoor_seating', isMandatory: false, weight: 4 },
        { featureName: 'cozy_seating', isMandatory: false, weight: 3 },
        { featureName: 'spacious', isMandatory: false, weight: 2 },
      ],
    },
  ];

  for (const data of purposes) {
    const { requirements, ...purposeData } = data;

    let purpose = await purposeRepo.findOne({ where: { slug: data.slug } });
    if (!purpose) {
      purpose = purposeRepo.create(purposeData);
      purpose = await purposeRepo.save(purpose);
    }

    // Legacy seed disabled — purpose_requirements now uses feature_id (FK).
    // Use POST /admin/purposes/sync API instead. The `requirements` list is
    // kept in this file as historical reference data only.
    void requirementRepo;
    void requirements;
  }

  console.log('Purposes and requirements seeded successfully');
}
