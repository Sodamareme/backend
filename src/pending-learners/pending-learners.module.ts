// src/pending-learners/pending-learners.module.ts
import { Module } from '@nestjs/common';
import { PendingLearnersController } from './pending-learners.controller';
import { PendingLearnersService } from './pending-learners.service';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { EmailModule } from '../email/email.module';
import { LearnersModule } from '../learners/learners.module';

@Module({
  imports: [CloudinaryModule, EmailModule, LearnersModule],
  controllers: [PendingLearnersController],
  providers: [PendingLearnersService, PrismaService],
  exports: [PendingLearnersService],
})
export class PendingLearnersModule {}
