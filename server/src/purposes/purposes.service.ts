import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Purpose } from './entities/purpose.entity';

@Injectable()
export class PurposesService {
  constructor(
    @InjectRepository(Purpose)
    private readonly purposesRepository: Repository<Purpose>,
  ) {}

  async findAll() {
    return this.purposesRepository.find({
      relations: ['requirements'],
      order: { displayOrder: 'ASC' },
    });
  }
}
