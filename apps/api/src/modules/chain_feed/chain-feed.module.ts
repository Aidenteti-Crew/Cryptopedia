import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/common/basic-module/database.module';
import { ChainFeedService } from './chain-feed.service';
import { EcosystemController, EventsController } from './chain-feed.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [EventsController, EcosystemController],
  providers: [ChainFeedService],
  exports: [ChainFeedService],
})
export class ChainFeedModule {}
