import { Module } from '@nestjs/common';
import { FavoriteModule } from 'src/favorite/favorite.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UserModule } from 'src/user/user.module';
import { ItemController } from './item.controller';
import { ItemService } from './item.service';

@Module({
  controllers: [ItemController],
  providers: [ItemService],
  imports: [PrismaModule, FavoriteModule, UserModule],
})
export class ItemModule {}
