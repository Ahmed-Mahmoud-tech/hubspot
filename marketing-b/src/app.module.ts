import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { PlanController } from './controllers/plan.controller';
import { StripeController } from './controllers/stripe.controller';
import { AdminController } from './controllers/admin.controller';
import { AppService } from './app.service';
// import { PlanService } from './services/plan.service';
import { PlanModule } from './modules/plan.module';
import { EmailService } from './services/email.service';
import { UserService } from './services/user.service';
import { AdminService } from './services/admin.service';
import { Payment } from './entities/payment.entity';
import { AuthModule } from './modules/auth.module';
import { HubSpotModule } from './modules/hubspot.module';
import { MergingModule } from './modules/merging.module';
import { RemovalModule } from './modules/removal.module';
import { User } from './entities/user.entity';
import { UserPlan } from './entities/user-plan.entity';
import { Action } from './entities/action.entity';
import { Contact } from './entities/contact.entity';
import { Matching } from './entities/matching.entity';
import { Modified } from './entities/modified.entity';
import { Remove } from './entities/remove.entity';
import { Merging } from './entities/merging.entity';
import { HubSpotConnection } from './entities/hubspot-connection.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DATABASE_HOST'),
        port: +configService.get('DATABASE_PORT'),
        username: configService.get('DATABASE_USERNAME'),
        password: configService.get('DATABASE_PASSWORD'),
        database: configService.get('DATABASE_NAME'),
        entities: [
          User,
          Action,
          Contact,
          Matching,
          Modified,
          Remove,
          Merging,
          UserPlan,
          Payment,
          HubSpotConnection,
        ],
        synchronize: process.env.NODE_ENV === 'development',
        logging: process.env.NODE_ENV === 'development',
        ssl:
          configService.get('DATABASE_SSLMODE') === 'require'
            ? { rejectUnauthorized: false }
            : false,
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    HubSpotModule,
    MergingModule,
    RemovalModule,
    TypeOrmModule.forFeature([UserPlan, Payment, User]),
    PlanModule,
  ],
  controllers: [
    AppController,
    PlanController,
    StripeController,
    AdminController,
  ],
  providers: [AppService, EmailService, UserService, AdminService],
})
export class AppModule {
  // Removed CORS middleware - using app.enableCors() in main.ts instead
}
