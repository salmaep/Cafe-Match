import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Destination } from './entities/destination.entity';

@Injectable()
export class DestinationsService {
  constructor(
    @InjectRepository(Destination)
    private readonly destinationsRepository: Repository<Destination>,
  ) {}

  async findAll() {
    const rows = await this.destinationsRepository.find({
      where: { isActive: 1 },
      order: { displayOrder: 'ASC' },
    });
    return rows.map((r) => ({
      id: r.id,
      label: r.label,
      sublabel: r.sublabel,
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
      displayOrder: r.displayOrder,
    }));
  }
}
