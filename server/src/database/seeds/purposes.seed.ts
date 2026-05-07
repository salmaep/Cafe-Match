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
        { facilityKey: 'quiet_atmosphere', isMandatory: true, weight: 5 },
        { facilityKey: 'cozy_seating', isMandatory: false, weight: 4 },
        { facilityKey: 'outdoor_seating', isMandatory: false, weight: 2 },
      ],
    },
    {
      slug: 'date',
      name: 'Date',
      description: 'Romantic spots with great ambiance for couples',
      icon: 'heart',
      displayOrder: 2,
      requirements: [
        { facilityKey: 'ambient_lighting', isMandatory: true, weight: 5 },
        { facilityKey: 'intimate_seating', isMandatory: true, weight: 5 },
        { facilityKey: 'quiet_atmosphere', isMandatory: false, weight: 3 },
        { facilityKey: 'outdoor_seating', isMandatory: false, weight: 2 },
      ],
    },
    {
      slug: 'family',
      name: 'Family Time',
      description: 'Kid-friendly, spacious places for the whole family',
      icon: 'users',
      displayOrder: 3,
      requirements: [
        { facilityKey: 'kid_friendly', isMandatory: true, weight: 5 },
        { facilityKey: 'spacious', isMandatory: true, weight: 4 },
        { facilityKey: 'noise_tolerant', isMandatory: false, weight: 3 },
        { facilityKey: 'parking', isMandatory: false, weight: 3 },
      ],
    },
    {
      slug: 'group-work',
      name: 'Group Work / Study',
      description: 'Spaces with large tables and meeting facilities',
      icon: 'book-open',
      displayOrder: 4,
      requirements: [
        { facilityKey: 'large_tables', isMandatory: true, weight: 5 },
        { facilityKey: 'strong_wifi', isMandatory: true, weight: 4 },
        { facilityKey: 'power_outlets', isMandatory: false, weight: 3 },
        { facilityKey: 'whiteboard', isMandatory: false, weight: 3 },
        { facilityKey: 'bookable_space', isMandatory: false, weight: 2 },
      ],
    },
    {
      slug: 'wfc',
      name: 'Work from Cafe',
      description: 'Reliable WiFi, power outlets, and a quiet environment',
      icon: 'laptop',
      displayOrder: 5,
      requirements: [
        { facilityKey: 'strong_wifi', isMandatory: true, weight: 5 },
        { facilityKey: 'power_outlets', isMandatory: true, weight: 5 },
        { facilityKey: 'quiet_atmosphere', isMandatory: false, weight: 3 },
        { facilityKey: 'large_tables', isMandatory: false, weight: 2 },
        { facilityKey: 'cozy_seating', isMandatory: false, weight: 1 },
      ],
    },
    {
      slug: 'meeting',
      name: 'Meeting',
      description: 'Quiet, bookable spots for client or team meetings',
      icon: 'briefcase',
      displayOrder: 6,
      requirements: [
        { facilityKey: 'bookable_space', isMandatory: false, weight: 4 },
        { facilityKey: 'strong_wifi', isMandatory: true, weight: 5 },
        { facilityKey: 'quiet_atmosphere', isMandatory: false, weight: 4 },
        { facilityKey: 'large_tables', isMandatory: false, weight: 3 },
        { facilityKey: 'power_outlets', isMandatory: false, weight: 2 },
      ],
    },
    {
      slug: 'brainstorm',
      name: 'Brainstorm',
      description: 'Open-space cafes ideal for creative collaboration',
      icon: 'lightbulb',
      displayOrder: 7,
      requirements: [
        { facilityKey: 'large_tables', isMandatory: true, weight: 5 },
        { facilityKey: 'whiteboard', isMandatory: false, weight: 4 },
        { facilityKey: 'spacious', isMandatory: false, weight: 4 },
        { facilityKey: 'noise_tolerant', isMandatory: false, weight: 3 },
        { facilityKey: 'strong_wifi', isMandatory: false, weight: 2 },
      ],
    },
    {
      slug: 'catch-up',
      name: 'Catch Up',
      description: 'Relaxed cafes perfect for chatting with old friends',
      icon: 'coffee-cup',
      displayOrder: 8,
      requirements: [
        { facilityKey: 'cozy_seating', isMandatory: true, weight: 5 },
        { facilityKey: 'noise_tolerant', isMandatory: false, weight: 3 },
        { facilityKey: 'outdoor_seating', isMandatory: false, weight: 3 },
        { facilityKey: 'ambient_lighting', isMandatory: false, weight: 2 },
      ],
    },
    {
      slug: 'reading',
      name: 'Reading',
      description: 'Quiet corners with cozy seating for solo reading',
      icon: 'book',
      displayOrder: 9,
      requirements: [
        { facilityKey: 'quiet_atmosphere', isMandatory: true, weight: 5 },
        { facilityKey: 'cozy_seating', isMandatory: false, weight: 4 },
        { facilityKey: 'ambient_lighting', isMandatory: false, weight: 3 },
        { facilityKey: 'power_outlets', isMandatory: false, weight: 1 },
      ],
    },
    {
      slug: 'celebration',
      name: 'Celebration',
      description: 'Spacious, vibrant cafes for birthdays & special moments',
      icon: 'party',
      displayOrder: 10,
      requirements: [
        { facilityKey: 'spacious', isMandatory: true, weight: 5 },
        { facilityKey: 'large_tables', isMandatory: false, weight: 4 },
        { facilityKey: 'outdoor_seating', isMandatory: false, weight: 3 },
        { facilityKey: 'noise_tolerant', isMandatory: false, weight: 3 },
        { facilityKey: 'ambient_lighting', isMandatory: false, weight: 2 },
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
        { facilityKey: 'cozy_seating', isMandatory: false, weight: 3 },
        { facilityKey: 'parking', isMandatory: false, weight: 3 },
        { facilityKey: 'payment_qris', isMandatory: false, weight: 2 },
        { facilityKey: 'payment_ewallet', isMandatory: false, weight: 2 },
      ],
    },
    {
      slug: 'photo-spot',
      name: 'Photo Spot',
      description: 'Aesthetic cafes — perfect lighting & instagrammable spots',
      icon: 'camera',
      displayOrder: 12,
      requirements: [
        { facilityKey: 'ambient_lighting', isMandatory: true, weight: 5 },
        { facilityKey: 'outdoor_seating', isMandatory: false, weight: 4 },
        { facilityKey: 'cozy_seating', isMandatory: false, weight: 3 },
        { facilityKey: 'spacious', isMandatory: false, weight: 2 },
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

    for (const req of requirements) {
      const existing = await requirementRepo.findOne({
        where: { purposeId: purpose.id, facilityKey: req.facilityKey },
      });
      if (!existing) {
        await requirementRepo.save(
          requirementRepo.create({ ...req, purposeId: purpose.id }),
        );
      }
    }
  }

  console.log('Purposes and requirements seeded successfully');
}
