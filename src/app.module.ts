import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { LearnersModule } from './learners/learners.module';
import { CoachesModule } from './coaches/coaches.module';
import { PromotionsModule } from './promotions/promotions.module';
import { ReferentialsModule } from './referentials/referentials.module';
import { AttendanceModule } from './attendance/attendance.module';
import { ModulesModule } from './modules/modules.module';
import { EventsModule } from './events/events.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { MealsModule } from './meals/meals.module';
import { VigilsModule } from './vigils/vigils.module';
import { RestaurateursModule } from './restaurateurs/restaurateurs.module';
import { GradesModule } from './grades/grades.module';
import { EmailModule } from '../src/email/email.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    LearnersModule,
    CoachesModule,
    VigilsModule,
    RestaurateursModule,
    PromotionsModule,
    ReferentialsModule,
    AttendanceModule,
    ModulesModule,
    EventsModule,
    CloudinaryModule,
    MealsModule,
    GradesModule,
    EmailModule,
  
  ],
  
})
export class AppModule {}