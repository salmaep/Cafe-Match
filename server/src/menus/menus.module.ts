import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CafeMenu } from './entities/cafe-menu.entity';
import { MenusService } from './menus.service';

@Module({
  imports: [TypeOrmModule.forFeature([CafeMenu])],
  providers: [MenusService],
  exports: [MenusService],
})
export class MenusModule {}
