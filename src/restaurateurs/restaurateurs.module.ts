import { Module } from '@nestjs/common';
import { RestaurateursService } from './restaurateurs.service';
import { RestaurateursController } from './restaurateurs.controller';
import { MealScansController } from './meal-scans.controller';
import { MealScansService } from './meal-scans.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { VigilsModule } from '../vigils/vigils.module';

@Module({
  imports: [PrismaModule, CloudinaryModule, VigilsModule],
  controllers: [RestaurateursController, MealScansController],
  providers: [RestaurateursService, MealScansService],
  exports: [RestaurateursService, MealScansService],
})
export class RestaurateursModule {}
