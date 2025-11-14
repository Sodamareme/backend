import { Module } from '@nestjs/common';
import { RestaurateursService } from './restaurateurs.service';
import { RestaurateursController } from './restaurateurs.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { VigilsModule } from '../vigils/vigils.module';

@Module({
  imports: [PrismaModule, CloudinaryModule, VigilsModule, RestaurateursModule],
  controllers: [RestaurateursController],
  providers: [RestaurateursService],
  exports: [RestaurateursService],
})
export class RestaurateursModule {}