import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth.module';
import { HubSpotModule } from './modules/hubspot.module';
import { MergingModule } from './modules/merging.module';
import { RemovalModule } from './modules/removal.module';
import { User } from './entities/user.entity';
import { Action } from './entities/action.entity';
import { Contact } from './entities/contact.entity';
import { Matching } from './entities/matching.entity';
import { Modified } from './entities/modified.entity';
import { Remove } from './entities/remove.entity';
import { Merging } from './entities/merging.entity';
import { CorsMiddleware } from './middleware/cors.middleware';

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
        entities: [User, Action, Contact, Matching, Modified, Remove, Merging],
        synchronize: process.env.NODE_ENV === 'development',
        logging: process.env.NODE_ENV === 'development',
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    HubSpotModule,
    MergingModule,
    RemovalModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorsMiddleware).forRoutes('*');
  }
}
