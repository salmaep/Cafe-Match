import {
  DataSource,
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  RecoverEvent,
  RemoveEvent,
  SoftRemoveEvent,
  UpdateEvent,
} from 'typeorm';
import { Inject, Logger } from '@nestjs/common';
import { Cafe } from '../cafes/entities/cafe.entity';
import { MeiliCafesService } from './meili-cafes.service';

@EventSubscriber()
export class CafeMeiliSubscriber implements EntitySubscriberInterface<Cafe> {
  private readonly logger = new Logger(CafeMeiliSubscriber.name);

  constructor(
    dataSource: DataSource,
    @Inject(MeiliCafesService)
    private readonly meiliCafes: MeiliCafesService,
  ) {
    dataSource.subscribers.push(this);
  }

  listenTo() {
    return Cafe;
  }

  async afterInsert(event: InsertEvent<Cafe>): Promise<void> {
    await this.syncIndex(event.entity?.id, 'index');
  }

  async afterUpdate(event: UpdateEvent<Cafe>): Promise<void> {
    const id = (event.entity?.id ?? event.databaseEntity?.id) as
      | number
      | undefined;
    await this.syncIndex(id, 'index');
  }

  async afterSoftRemove(event: SoftRemoveEvent<Cafe>): Promise<void> {
    await this.syncRemove(event.entity?.id, 'remove');
  }

  async afterRemove(event: RemoveEvent<Cafe>): Promise<void> {
    const id = event.entityId ?? event.entity?.id;
    await this.syncRemove(id, 'remove');
  }

  async afterRecover(event: RecoverEvent<Cafe>): Promise<void> {
    await this.syncIndex(event.entity?.id, 'index');
  }

  private async syncIndex(
    cafeId: number | undefined,
    op: 'index',
  ): Promise<void> {
    if (!cafeId) return;
    try {
      await this.meiliCafes.indexCafe(cafeId);
    } catch (err) {
      this.logger.error(`Meili ${op} failed for cafe ${cafeId}`, err);
      await this.meiliCafes.queueFailure(cafeId, op, String(err));
    }
  }

  private async syncRemove(
    cafeId: number | undefined,
    op: 'remove',
  ): Promise<void> {
    if (!cafeId) return;
    try {
      await this.meiliCafes.removeCafe(cafeId);
    } catch (err) {
      this.logger.error(`Meili ${op} failed for cafe ${cafeId}`, err);
      await this.meiliCafes.queueFailure(cafeId, op, String(err));
    }
  }
}
