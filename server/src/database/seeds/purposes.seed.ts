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
