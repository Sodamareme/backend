import { Module } from '@nestjs/common';
import { ReferentialsService } from './referentials.service';
import { ReferentialsController } from './referentials.controller';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [CloudinaryModule, PrismaModule],
  providers: [ReferentialsService],
  controllers: [ReferentialsController],
  exports: [ReferentialsService],
})
export class ReferentialsModule {}