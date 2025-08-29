import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { MergingController } from '../controllers/merging.controller';
import { MergingService } from '../services/merging.service';
import { HubSpotConnectionService } from '../services/hubspot-connection.service';
import { HubSpotOAuthService } from '../services/hubspot-oauth.service';
import { Merging } from '../entities/merging.entity';
import { Contact } from '../entities/contact.entity';
import { User } from '../entities/user.entity';
import { Matching } from '../entities/matching.entity';
import { HubSpotConnection } from '../entities/hubspot-connection.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Merging,
      Contact,
      User,
      Matching,
      HubSpotConnection,
    ]),
  ],
  controllers: [MergingController],
  providers: [
    MergingService,
    HubSpotConnectionService,
    HubSpotOAuthService,
    ConfigService,
  ],
  exports: [MergingService],
})
export class MergingModule {}
