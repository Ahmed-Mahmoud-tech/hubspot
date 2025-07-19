import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HubSpotController } from '../controllers/hubspot.controller';
import { HubSpotService } from '../services/hubspot.service';
import { Contact } from '../entities/contact.entity';
import { Action } from '../entities/action.entity';
import { User } from '../entities/user.entity';
import { Matching } from '../entities/matching.entity';
import { Modified } from '../entities/modified.entity';
import { Remove } from '../entities/remove.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Contact,
      Action,
      User,
      Matching,
      Modified,
      Remove,
    ]),
  ],
  controllers: [HubSpotController],
  providers: [HubSpotService],
  exports: [HubSpotService],
})
export class HubSpotModule {}
