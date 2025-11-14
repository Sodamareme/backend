import { Module } from '@nestjs/common';
import { VigilsService } from './vigils.service';
import { VigilsController } from './vigils.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [PrismaModule, CloudinaryModule],
  controllers: [VigilsController],
  providers: [VigilsService],
  exports: [VigilsService],
})
export class VigilsModule {}